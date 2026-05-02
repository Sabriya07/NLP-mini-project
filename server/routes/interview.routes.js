import { Router } from 'express'
import auth from '../middleware/auth.middleware.js'
import role from '../middleware/role.middleware.js'
import Interview from '../models/Interview.js'
import Job from '../models/Job.js'
import Resume from '../models/Resume.js'

const router = Router()

router.post('/', auth, role('hr'), async (req, res) => {
  try {
    const {
      jobId,
      resumeId,
      title,
      message,
      interviewDate = '',
      interviewMode = '',
      interviewLocation = '',
    } = req.body

    if (!jobId || !resumeId || !title || !message) {
      return res.status(400).json({ message: 'Job, employee profile, title, and message are required.' })
    }

    const [job, resume] = await Promise.all([
      Job.findById(jobId),
      Resume.findById(resumeId).populate('userId', 'name email'),
    ])

    if (!job) return res.status(404).json({ message: 'Job not found.' })
    if (!resume) return res.status(404).json({ message: 'Employee profile not found.' })
    if (job.hrId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only schedule interviews for your own jobs.' })
    }

    const interview = await Interview.findOneAndUpdate(
      { jobId, employeeId: resume.userId._id },
      {
        jobId,
        hrId: req.user.id,
        employeeId: resume.userId._id,
        resumeId,
        title,
        message,
        interviewDate,
        interviewMode,
        interviewLocation,
        status: 'scheduled',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    res.status(201).json({
      interview: {
        id: interview._id,
        title: interview.title,
        message: interview.message,
        interviewDate: interview.interviewDate,
        interviewMode: interview.interviewMode,
        interviewLocation: interview.interviewLocation,
        sentAt: interview.createdAt,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/mine', auth, role('employee'), async (req, res) => {
  try {
    const interviews = await Interview.find({ employeeId: req.user.id })
      .populate('jobId', 'title description')
      .populate('hrId', 'name email')
      .sort({ createdAt: -1 })

    res.json({
      interviews: interviews.map((interview) => ({
        id: interview._id,
        title: interview.title,
        message: interview.message,
        interviewDate: interview.interviewDate,
        interviewMode: interview.interviewMode,
        interviewLocation: interview.interviewLocation,
        sentAt: interview.createdAt,
        status: interview.status,
        job: interview.jobId ? {
          id: interview.jobId._id,
          title: interview.jobId.title,
          description: interview.jobId.description,
        } : null,
        hr: interview.hrId ? {
          id: interview.hrId._id,
          name: interview.hrId.name,
          email: interview.hrId.email,
        } : null,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

export default router
