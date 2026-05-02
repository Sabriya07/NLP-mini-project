import { Router } from 'express'
import Job from '../models/Job.js'
import Resume from '../models/Resume.js'
import Interview from '../models/Interview.js'
import auth from '../middleware/auth.middleware.js'
import role from '../middleware/role.middleware.js'
import { embedJob } from '../services/nlp.services.js'
import { syncJobRanking, syncResumeMatches } from '../services/matching.service.js'

const router = Router()

router.post('/', auth, role('hr'), async (req, res) => {
  try {
    const { title, description } = req.body
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' })
    }

    const embeddedJob = await embedJob(description)
    const job = await Job.create({
      hrId: req.user.id,
      title,
      description,
      embedding: embeddedJob.embedding,
      topic_id: embeddedJob.topic_id,
      domain: embeddedJob.domain,
      keywords: embeddedJob.keywords || [],
    })

    await syncJobRanking(job)

    const resumes = await Resume.find()
    await Promise.all(resumes.map((resume) => syncResumeMatches(resume)))

    res.status(201).json({ job })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/', auth, role('hr'), async (req, res) => {
  try {
    const jobs = await Job.find({ hrId: req.user.id }).sort({ createdAt: -1 })
    res.json({ jobs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id/applicants', auth, role('hr'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
    if (!job) return res.status(404).json({ message: 'Job not found' })
    if (job.hrId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your job posting' })
    }

    const resumes = await Resume.find({
      _id: { $in: job.ranked.map(item => item.resumeId).filter(Boolean) }
    }).populate('userId', 'name email')
    const interviews = await Interview.find({ jobId: job._id })

    const resumeMap = new Map(resumes.map(resume => [resume._id.toString(), resume]))
    const interviewMap = new Map(interviews.map((interview) => [interview.resumeId.toString(), interview]))

    const ranked = job.ranked.map(item => {
      const resume = item.resumeId ? resumeMap.get(item.resumeId.toString()) : null
      const interview = resume ? interviewMap.get(resume._id.toString()) : null
      return {
        ...item.toObject(),
        applicant: resume ? {
          id: resume.userId?._id,
          name: resume.personalInfo?.full_name || resume.userId?.name,
          email: resume.personalInfo?.email || resume.userId?.email,
        } : null,
        resume: resume ? {
          id: resume._id,
          fileUrl: resume.fileUrl,
          domain: resume.domain,
          keywords: resume.keywords || [],
          personalInfo: resume.personalInfo,
          employmentHistory: resume.employmentHistory || [],
          education: resume.education || [],
          skills: resume.skills || [],
          career_objective: resume.career_objective,
          rawText: resume.rawText,
        } : null,
        interview: interview ? {
          id: interview._id,
          title: interview.title,
          message: interview.message,
          interviewDate: interview.interviewDate,
          interviewMode: interview.interviewMode,
          interviewLocation: interview.interviewLocation,
          sentAt: interview.createdAt,
        } : null,
      }
    })

    res.json({
      job: {
        _id: job._id,
        title: job.title,
        description: job.description,
        domain: job.domain,
        keywords: job.keywords || [],
      },
      ranked,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', auth, role('hr'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
    if (!job) return res.status(404).json({ message: 'Job not found' })
    if (job.hrId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your job posting' })
    }

    await Promise.all([
      Job.deleteOne({ _id: job._id }),
      Interview.deleteMany({ jobId: job._id }),
      Resume.updateMany(
        {},
        { $pull: { matches: { jobId: job._id } } }
      ),
    ])

    res.json({ message: 'Job deleted from the whole system.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

export default router
