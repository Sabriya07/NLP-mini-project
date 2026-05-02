import mongoose from 'mongoose'

const interviewSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  interviewDate: {
    type: String,
    default: '',
  },
  interviewMode: {
    type: String,
    default: '',
  },
  interviewLocation: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['scheduled'],
    default: 'scheduled',
  },
}, { timestamps: true })

interviewSchema.index({ jobId: 1, employeeId: 1 }, { unique: true })

export default mongoose.models.Interview || mongoose.model('Interview', interviewSchema)
