import Job from '../models/Job.js'
import Resume from '../models/Resume.js'
import { matchJobsForResume, rankResumesForJob } from './nlp.services.js'

function plainResumeName(resume) {
  return resume.personalInfo?.full_name || resume.userId?.name || 'Unknown Candidate'
}

function plainResumeEmail(resume) {
  return resume.personalInfo?.email || resume.userId?.email || ''
}

export async function syncResumeMatches(resumeDoc) {
  const jobs = await Job.find().select('title description embedding topic_id domain keywords')
  const payload = jobs.map((job) => ({
    id: job._id.toString(),
    title: job.title,
    description: job.description,
    embedding: job.embedding,
    topic_id: job.topic_id,
  }))

  const { matched = [] } = await matchJobsForResume(resumeDoc.rawText, payload)

  resumeDoc.matches = matched.map((match) => ({
    jobId: match.id,
    title: match.title,
    similarity_score: match.similarity_score,
    semantic_score: match.semantic_score,
    skill_score: match.skill_score,
    topic_score: match.topic_score,
    matched_skills: match.matched_skills || [],
    domain: match.domain || 'General',
    topic_keywords: match.topic_keywords || [],
  }))

  await resumeDoc.save()
  return matched
}

export async function syncJobRanking(jobDoc) {
  const resumes = await Resume.find().populate('userId', 'name email')
  const payload = resumes.map((resume) => ({
    id: resume._id.toString(),
    name: plainResumeName(resume),
    text: resume.rawText,
    embedding: resume.embedding,
    topic_id: resume.topic_id,
  }))

  const ranked = await rankResumesForJob(jobDoc.description, payload)

  jobDoc.ranked = ranked.map((result) => {
    const resume = resumes.find((entry) => entry._id.toString() === result.id)
    return {
      userId: resume?.userId?._id,
      resumeId: result.id,
      name: result.name,
      similarity_score: result.similarity_score,
      semantic_score: result.semantic_score,
      skill_score: result.skill_score,
      topic_score: result.topic_score,
      matched_skills: result.matched_skills || [],
      domain: result.domain || 'General',
      topic_keywords: result.topic_keywords || [],
      applicantEmail: plainResumeEmail(resume),
    }
  })

  await jobDoc.save()
  return ranked
}

export async function syncResumeAcrossJobs(resumeDoc) {
  const jobs = await Job.find()
  const matched = await syncResumeMatches(resumeDoc)
  const matchMap = new Map(matched.map((item) => [item.id, item]))

  for (const job of jobs) {
    const result = matchMap.get(job._id.toString())
    if (!result) {
      job.ranked = (job.ranked || []).filter(
        (entry) => entry.resumeId?.toString() !== resumeDoc._id.toString()
      )
      await job.save()
      continue
    }

    const nextItem = {
      userId: resumeDoc.userId,
      resumeId: resumeDoc._id,
      name: plainResumeName(resumeDoc),
      similarity_score: result.similarity_score,
      semantic_score: result.semantic_score,
      skill_score: result.skill_score,
      topic_score: result.topic_score,
      matched_skills: result.matched_skills || [],
      domain: result.domain || 'General',
      topic_keywords: result.topic_keywords || [],
      applicantEmail: plainResumeEmail(resumeDoc),
    }

    const remaining = (job.ranked || []).filter(
      (entry) => entry.resumeId?.toString() !== resumeDoc._id.toString()
    )
    job.ranked = [...remaining, nextItem].sort(
      (a, b) => (b.similarity_score || 0) - (a.similarity_score || 0)
    )
    await job.save()
  }
}

export async function removeResumeFromJobs(resumeId) {
  await Job.updateMany(
    {},
    { $pull: { ranked: { resumeId } } }
  )
}
