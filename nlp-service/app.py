import os
import re
from typing import List, Optional

import spacy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nlp_model import RecruitmentNLP, extract_skills, keyword_frequency_terms, summarize_sections

app = FastAPI(title='Recruitment NLP API', version='3.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

SAVE_PATH = 'saved_model'
os.environ['HF_HUB_DISABLE_SSL_VERIFICATION'] = '1'
nlp_engine = None
try:
    nlp_engine = RecruitmentNLP()
    if os.path.exists(os.path.join(SAVE_PATH, 'bertopic_model')):
        nlp_engine.load(SAVE_PATH)
        print('Model ready.')
    else:
        print('WARNING: Run train.py first to generate BERTopic artifacts.')
except Exception as e:
    print(f'WARNING: Failed to load NLP model: {e}')
    print('NLP service will start without model - some features may not work.')

try:
    spacy_nlp = spacy.load('en_core_web_sm')
    print('spaCy loaded.')
except Exception:
    spacy_nlp = None
    print('WARNING: python -m spacy download en_core_web_sm')


class TextReq(BaseModel):
    text: str


class ResumeItem(BaseModel):
    id: str
    name: str
    text: str
    embedding: Optional[List[float]] = None
    topic_id: Optional[int] = None


class JobItem(BaseModel):
    id: str
    title: str
    description: str
    embedding: Optional[List[float]] = None
    topic_id: Optional[int] = None


class RankReq(BaseModel):
    job_description: str
    resumes: List[ResumeItem]


class MatchReq(BaseModel):
    resume_text: str
    jobs: List[JobItem]


def extract_education(text):
    patterns = [
        r'(?:b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|mba|bca|mca|phd|bachelor|master)[^.\n]{0,80}',
        r'(?:university|college|institute)[^.\n]{0,80}',
    ]
    matches = []
    for pattern in patterns:
        for item in re.finditer(pattern, text, re.IGNORECASE):
            matches.append(item.group(0).strip(' ,.-'))
    return list(dict.fromkeys(matches))[:6]


def extract_projects(text):
    patterns = [
        r'(?:project|projects|built|developed|created|implemented)\s*[:\-]?\s*([^\n]{15,150})',
    ]
    projects = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            projects.append(match.group(1).strip(' -'))
    projects.extend(summarize_sections(text, limit=8))
    unique = []
    for item in projects:
        if 15 <= len(item) <= 150 and item not in unique:
            unique.append(item)
    return unique[:6]


def extract_experience(text):
    spans = []
    if spacy_nlp:
        doc = spacy_nlp(text[:7000])
        spans.extend([
            ent.text.strip()
            for ent in doc.ents
            if ent.label_ in {'DATE', 'TIME'}
        ])

    timeline_patterns = [
        r'(?:\d{4}\s*[-–]\s*(?:present|\d{4}))',
        r'(?:\d+\+?\s+years?\s+(?:of\s+)?experience)',
        r'(?:internship|engineer|developer|analyst|manager)[^.\n]{0,80}',
    ]
    for pattern in timeline_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            spans.append(match.group(0).strip())

    result = []
    for item in spans:
        if item and item not in result:
            result.append(item)
    return result[:8]


def extract_career_objective(text):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    relevant = [sentence.strip() for sentence in sentences if 25 <= len(sentence.strip()) <= 240]
    if relevant:
        return ' '.join(relevant[:2])[:500]
    summary = summarize_sections(text, limit=2)
    return ' '.join(summary)[:500]


@app.get('/')
def root():
    return {'status': 'NLP API running', 'version': '3.0'}


@app.get('/health')
def health():
    return {
        'model_loaded': nlp_engine is not None,
        'sbert_loaded': nlp_engine.sbert is not None if nlp_engine else False,
        'bertopic_loaded': nlp_engine.topic_model is not None if nlp_engine else False,
        'spacy_loaded': spacy_nlp is not None,
    }


@app.post('/analyze-resume')
def analyze_resume(req: TextReq):
    if nlp_engine is None:
        raise HTTPException(503, 'NLP model not loaded')
    if len(req.text.strip()) < 20:
        raise HTTPException(400, 'Text too short')
    try:
        return nlp_engine.analyze_resume(req.text)
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post('/extract-ner')
def extract_ner(req: TextReq):
    text = req.text.strip()
    if len(text) < 20:
        raise HTTPException(400, 'Text too short')

    orgs = []
    locations = []
    if spacy_nlp:
        doc = spacy_nlp(text[:7000])
        orgs = list(dict.fromkeys(
            ent.text.strip()
            for ent in doc.ents
            if ent.label_ == 'ORG'
        ))[:8]
        locations = list(dict.fromkeys(
            ent.text.strip()
            for ent in doc.ents
            if ent.label_ in {'GPE', 'LOC'}
        ))[:6]

    return {
        'career_objective': extract_career_objective(text),
        'skills': extract_skills(text),
        'education': extract_education(text),
        'experience': extract_experience(text),
        'projects': extract_projects(text),
        'orgs': orgs,
        'locations': locations,
        'keywords': keyword_frequency_terms(text),
    }


@app.post('/embed-job')
def embed_job(req: TextReq):
    if nlp_engine is None:
        raise HTTPException(503, 'NLP model not loaded')
    try:
        analysis = nlp_engine.analyze_resume(req.text)
        return {
            'embedding': analysis['embedding'],
            'topic_id': analysis['topic_id'],
            'domain': analysis['domain'],
            'keywords': analysis['keywords'],
            'skills': extract_skills(req.text),
        }
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post('/rank-applicants')
def rank_applicants(req: RankReq):
    if nlp_engine is None:
        raise HTTPException(503, 'NLP model not loaded')
    try:
        resumes = [
            {
                'id': resume.id,
                'name': resume.name,
                'text': resume.text,
                'embedding': resume.embedding,
                'topic_id': -1 if resume.topic_id is None else resume.topic_id,
            }
            for resume in req.resumes
        ]
        return {'ranked': nlp_engine.rank_resumes_for_job(req.job_description, resumes)}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post('/match-jobs')
def match_jobs(req: MatchReq):
    if nlp_engine is None:
        raise HTTPException(503, 'NLP model not loaded')
    try:
        jobs = [
            {
                'id': job.id,
                'title': job.title,
                'description': job.description,
                'embedding': job.embedding,
                'topic_id': -1 if job.topic_id is None else job.topic_id,
            }
            for job in req.jobs
        ]
        matched = nlp_engine.match_jobs_for_resume(req.resume_text, jobs)
        best = matched[0] if matched else None
        return {
            'matched': matched,
            'best_match': {
                'predicted_role': best['title'] if best else None,
                'match_score': best['similarity_score'] if best else 0,
                'matched_skills': best['matched_skills'] if best else [],
            },
        }
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.get('/topics')
def get_topics():
    if nlp_engine is None or not nlp_engine.topic_model:
        raise HTTPException(503, 'NLP model not loaded or not trained')

    topics = []
    for topic_id in nlp_engine.topic_model.get_topics():
        if topic_id == -1:
            continue
        keywords = nlp_engine.get_topic_keywords(topic_id)
        topics.append({
            'id': topic_id,
            'keywords': keywords,
            'domain': nlp_engine.infer_domain(topic_id),
        })

    return {'topics': topics}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app:app', host='0.0.0.0', port=5001, reload=True)
