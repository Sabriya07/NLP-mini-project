import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Resume from '../models/Resume.js'
import Interview from '../models/Interview.js'
import auth from '../middleware/auth.middleware.js'
import role from '../middleware/role.middleware.js'
import { analyzeResume } from '../services/nlp.services.js'
import {
  removeResumeFromJobs,
  syncResumeAcrossJobs,
} from '../services/matching.service.js'

const router = express.Router()

const MM_YYYY = /^(0[1-9]|1[0-2])\/\d{4}$/
const YEAR_ONLY = /^\d{4}$/

function normalizeString(value = '') {
  return String(value || '').trim()
}

function normalizeSkill(skill = '') {
  return normalizeString(skill).replace(/\s+/g, ' ')
}

function normalizePersonalInfo(payload = {}) {
  return {
    full_name: normalizeString(payload.full_name),
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    city: normalizeString(payload.city),
  }
}

function normalizeEmploymentHistory(items = []) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 4)
    .map((item = {}) => ({
      company_name: normalizeString(item.company_name),
      job_title: normalizeString(item.job_title),
      start_date: normalizeString(item.start_date),
      end_date: normalizeString(item.end_date),
      is_present: Boolean(item.is_present),
      key_duties: normalizeString(item.key_duties).slice(0, 300),
    }))
}

function normalizeEducation(items = []) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 3)
    .map((item = {}) => ({
      institution_name: normalizeString(item.institution_name),
      degree: normalizeString(item.degree),
      year_completed: normalizeString(item.year_completed),
      cgpa: normalizeString(item.cgpa),
    }))
}

function normalizeSkills(items = []) {
  const cleaned = (Array.isArray(items) ? items : [])
    .map(normalizeSkill)
    .filter(Boolean)

  return [...new Set(cleaned)].slice(0, 20)
}

function validateProfile({ personalInfo, employmentHistory, education, skills, career_objective }) {
  if (!personalInfo.full_name || !personalInfo.email || !personalInfo.phone || !personalInfo.city) {
    return 'All personal information fields are required.'
  }

  if (skills.length < 3 || skills.length > 20) {
    return 'Please enter between 3 and 20 skills.'
  }

  if (!career_objective || career_objective.length > 500) {
    return 'Cover Letter / Career Objective is required and must be at most 500 characters.'
  }

  for (const role of employmentHistory) {
    if (role.start_date && !MM_YYYY.test(role.start_date)) {
      return 'Employment start date must use MM/YYYY.'
    }
    if (!role.is_present && role.end_date && !MM_YYYY.test(role.end_date)) {
      return 'Employment end date must use MM/YYYY unless Present is checked.'
    }
  }

  for (const item of education) {
    if (item.year_completed && !YEAR_ONLY.test(item.year_completed)) {
      return 'Education year completed must be a 4-digit year.'
    }
  }

  return null
}

function buildStructuredResumeText({ personalInfo, employmentHistory, education, skills, career_objective }) {
  const sections = [
    `Candidate ${personalInfo.full_name} based in ${personalInfo.city}.`,
    `Contact email ${personalInfo.email}. Phone ${personalInfo.phone}.`,
    `Skills: ${skills.join(', ')}.`,
    `Career Objective: ${career_objective}.`,
  ]

  if (employmentHistory.length) {
    sections.push(
      `Employment History: ${employmentHistory.map((entry) => [
        entry.job_title || 'Role',
        entry.company_name ? `at ${entry.company_name}` : '',
        entry.start_date ? `from ${entry.start_date}` : '',
        entry.is_present ? 'to Present' : entry.end_date ? `to ${entry.end_date}` : '',
        entry.key_duties ? `. Duties: ${entry.key_duties}` : '',
      ].join(' ').replace(/\s+/g, ' ').trim()).join(' | ')}.`
    )
  }

  if (education.length) {
    sections.push(
      `Education: ${education.map((entry) => [
        entry.degree,
        entry.institution_name ? `from ${entry.institution_name}` : '',
        entry.year_completed ? `completed ${entry.year_completed}` : '',
        entry.cgpa ? `CGPA ${entry.cgpa}` : '',
      ].join(' ').replace(/\s+/g, ' ').trim()).join(' | ')}.`
    )
  }

  return sections.join(' ')
}

function serializeResume(resumeDoc) {
  if (!resumeDoc) return null
  const resume = resumeDoc.toObject ? resumeDoc.toObject() : resumeDoc
  return resume
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync('uploads', { recursive: true })
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) =>
    cb(null, `${req.user?.id}_${Date.now()}${path.extname(file.originalname)}`),
})

const upload = multer({ storage })

router.post('/upload', auth, role('employee'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' })
    }

    res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.post('/profile', auth, role('employee'), async (req, res) => {
  try {
    const personalInfo = normalizePersonalInfo(req.body.personalInfo)
    const employmentHistory = normalizeEmploymentHistory(req.body.employmentHistory)
    const education = normalizeEducation(req.body.education)
    const skills = normalizeSkills(req.body.skills)
    const career_objective = normalizeString(req.body.career_objective).slice(0, 500)
    const fileUrl = normalizeString(req.body.fileUrl) || null

    const validationMessage = validateProfile({
      personalInfo,
      employmentHistory,
      education,
      skills,
      career_objective,
    })
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const rawText = buildStructuredResumeText({
      personalInfo,
      employmentHistory,
      education,
      skills,
      career_objective,
    })

    let analysis = { embedding: [], topic_id: -1, domain: 'General', keywords: [], skills: [] }
    try {
      analysis = await analyzeResume(rawText)
    } catch (nlpError) {
      console.warn('NLP analysis failed, using defaults:', nlpError.message)
    }

    const resume = await Resume.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        rawText,
        fileUrl,
        personalInfo,
        employmentHistory,
        education,
        skills,
        career_objective,
        embedding: analysis.embedding,
        topic_id: analysis.topic_id,
        domain: analysis.domain,
        keywords: analysis.keywords || [],
        confirmedAt: new Date(),
        matches: [],
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )

    await resume.populate('userId', 'name email')
    await syncResumeAcrossJobs(resume)

    res.json({
      resume: serializeResume(resume),
      best_match: resume.matches?.[0]
        ? {
            predicted_role: resume.matches[0].title,
            match_score: resume.matches[0].similarity_score,
            matched_skills: resume.matches[0].matched_skills || [],
          }
        : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/matches', auth, role('employee'), async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id })
    res.json({ resume: serializeResume(resume) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/', auth, role('employee'), async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id })
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found.' })
    }

    if (resume.fileUrl) {
      const relativePath = resume.fileUrl.replace(/^\/+/, '')
      const absolutePath = path.resolve(relativePath)
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
      }
    }

    await Promise.all([
      removeResumeFromJobs(resume._id),
      Interview.deleteMany({ resumeId: resume._id }),
      Resume.deleteOne({ _id: resume._id }),
    ])

    res.json({ message: 'Profile deleted successfully.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.delete('/verification-file', auth, role('employee'), async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id })
    if (!resume) {
      return res.status(404).json({ message: 'Employee profile not found.' })
    }

    if (resume.fileUrl) {
      const relativePath = resume.fileUrl.replace(/^\/+/, '')
      const absolutePath = path.resolve(relativePath)
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
      }
    }

    resume.fileUrl = null
    await resume.save()

    res.json({ message: 'Verification CV removed from the system.', resume: serializeResume(resume) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

export default router
