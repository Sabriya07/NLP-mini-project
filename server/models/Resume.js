import mongoose from 'mongoose'

const employmentSchema = new mongoose.Schema({
  company_name: { type: String, default: '' },
  job_title: { type: String, default: '' },
  start_date: { type: String, default: '' },
  end_date: { type: String, default: '' },
  is_present: { type: Boolean, default: false },
  key_duties: { type: String, default: '' },
}, { _id: false })

const educationSchema = new mongoose.Schema({
  institution_name: { type: String, default: '' },
  degree: { type: String, default: '' },
  year_completed: { type: String, default: '' },
  cgpa: { type: String, default: '' },
}, { _id: false })

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rawText: { type: String, required: true },
  fileUrl: { type: String, default: null },

  personalInfo: {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
  },

  employmentHistory: {
    type: [employmentSchema],
    default: [],
  },

  education: {
    type: [educationSchema],
    default: [],
  },

  skills: {
    type: [String],
    default: [],
  },

  career_objective: {
    type: String,
    default: '',
  },

  embedding: [Number],
  topic_id: { type: Number, default: -1 },
  domain: { type: String, default: 'General' },
  keywords: [String],
  confirmedAt: { type: Date, default: Date.now },

  matches: [{
    jobId: mongoose.Schema.Types.ObjectId,
    title: String,
    similarity_score: Number,
    semantic_score: Number,
    skill_score: Number,
    topic_score: Number,
    matched_skills: [String],
    domain: String,
    topic_keywords: [String],
  }],
}, { timestamps: true })

export default mongoose.models.Resume || mongoose.model('Resume', resumeSchema)
