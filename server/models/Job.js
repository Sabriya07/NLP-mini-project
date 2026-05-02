import mongoose from 'mongoose'

const jobSchema = new mongoose.Schema({
  hrId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  embedding:   [Number],
  topic_id:    { type: Number, default: -1 },
  domain:      { type: String, default: 'General' },
  keywords:    [String],
  ranked:      [{
    userId:           mongoose.Schema.Types.ObjectId,
    resumeId:         mongoose.Schema.Types.ObjectId,
    name:             String,
    similarity_score: Number,
    semantic_score:   Number,
    skill_score:      Number,
    topic_score:      Number,
    matched_skills:   [String],
    domain:           String,
    topic_keywords:   [String],
    applicantEmail:   String,
  }]
}, { timestamps: true })

export default mongoose.models.Job || mongoose.model('Job', jobSchema)
