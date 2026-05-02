import express  from 'express'
import mongoose from 'mongoose'
import cors     from 'cors'
import dotenv   from 'dotenv'

import authRoutes   from './routes/auth.routes.js'
import resumeRoutes from './routes/resume.routes.js'
import jobRoutes    from './routes/job.routes.js'
import interviewRoutes from './routes/interview.routes.js'

dotenv.config()
const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

app.use('/api/auth',   authRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/jobs',   jobRoutes)
app.use('/api/interviews', interviewRoutes)

try {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  )
} catch (err) {
  console.error(err)
}
