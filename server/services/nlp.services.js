// server/services/nlp.service.js
// Calls the FastAPI NLP microservice on port 5001

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5001'

// ── Helper ─────────────────────────────────────────────────
async function nlpPost(endpoint, body) {
  const res  = await fetch(`${NLP_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'NLP service error')
  return data
}

// ── Analyze a resume (SBERT + BERTopic + NER) ─────────────
export async function analyzeResume(resumeText) {
  return await nlpPost('/analyze-resume', { text: resumeText })
  // Returns: { embedding, topic_id, confidence, domain, keywords, skills }
}

// ── Extract NER for editable review form ──────────────────
export async function extractNER(resumeText) {
  return await nlpPost('/extract-ner', { text: resumeText })
  // Returns: { career_objective, skills, education, experience, projects, orgs, locations }
}

// ── Pre-embed a job description ───────────────────────────
export async function embedJob(jobDescription) {
  return await nlpPost('/embed-job', { text: jobDescription })
  // Returns: { embedding, topic_id, domain, keywords, skills }
}

// ── HR: rank resumes for a job ────────────────────────────
export async function rankResumesForJob(jobDescription, resumes) {
  const data = await nlpPost('/rank-applicants', {
    job_description: jobDescription,
    resumes,         // [{ id, name, text, embedding?, topic_id? }]
  })
  return data.ranked
  // Returns: [{ id, name, similarity_score, semantic_score,
  //             skill_score, topic_score, matched_skills, domain, topic_keywords }]
}

// ── Employee: match jobs for a resume ────────────────────
export async function matchJobsForResume(resumeText, jobs) {
  const data = await nlpPost('/match-jobs', {
    resume_text: resumeText,
    jobs,        // [{ id, title, description, embedding?, topic_id? }]
  })
  return {
    matched:    data.matched,
    best_match: data.best_match,
    // best_match: { predicted_role, match_score, matched_skills }
  }
}
