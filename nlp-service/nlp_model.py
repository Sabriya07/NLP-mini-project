import json
import math
import os
import re
from collections import Counter

import nltk
from bertopic import BERTopic
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer

nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

STOP_WORDS = set(stopwords.words('english'))
LEMMATIZER = WordNetLemmatizer()

SKILL_KEYWORDS = {
    'python', 'java', 'javascript', 'typescript', 'react', 'nodejs', 'node',
    'express', 'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp',
    'docker', 'kubernetes', 'machine learning', 'deep learning', 'nlp',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'html', 'css',
    'git', 'linux', 'rest', 'api', 'agile', 'scrum', 'cybersecurity',
    'networking', 'cloud', 'devops', 'flutter', 'kotlin', 'swift', 'android',
    'ios', 'figma', 'photoshop', 'data analysis', 'data science', 'power bi',
    'tableau', 'excel', 'c++', 'c#', 'ruby', 'php', 'golang', 'rust', 'scala',
    'spark', 'hadoop', 'blockchain', 'iot', 'microservices', 'graphql',
    'selenium', 'testing', 'qa', 'jenkins', 'cicd', 'terraform', 'redis',
    'fastapi', 'flask', 'django', 'spring boot', 'communication',
    'leadership', 'problem solving', 'statistics', 'etl', 'hive',
}

DOMAIN_HINTS = {
    'Data Science': {'python', 'machine learning', 'data', 'analysis', 'model', 'statistics', 'pandas', 'numpy'},
    'Web Development': {'react', 'javascript', 'typescript', 'frontend', 'backend', 'node', 'express', 'api'},
    'Cloud & DevOps': {'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'devops', 'jenkins'},
    'Mobile Development': {'android', 'ios', 'flutter', 'swift', 'kotlin', 'mobile'},
    'Cybersecurity': {'security', 'cybersecurity', 'network', 'threat', 'vulnerability'},
    'QA & Testing': {'testing', 'qa', 'selenium', 'automation', 'quality'},
}


def preprocess(text):
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', str(text).lower())
    tokens = word_tokenize(cleaned)
    return [
        LEMMATIZER.lemmatize(token)
        for token in tokens
        if token not in STOP_WORDS and len(token) > 2
    ]


def extract_skills(text):
    text_l = str(text).lower()
    normalized = text_l.replace('node.js', 'nodejs').replace('ci/cd', 'cicd')
    found = []
    for skill in sorted(SKILL_KEYWORDS):
      skill_key = skill.lower().replace('node.js', 'nodejs').replace('ci/cd', 'cicd')
      if skill_key in normalized:
          found.append(skill.title())
    return list(dict.fromkeys(found))


def cosine_similarity_scratch(vec_a, vec_b):
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    magnitude_a = math.sqrt(sum(a * a for a in vec_a))
    magnitude_b = math.sqrt(sum(b * b for b in vec_b))
    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0
    raw = dot / (magnitude_a * magnitude_b)
    normalized = (raw + 1) / 2
    return max(0.0, min(1.0, normalized))


def skill_overlap_score(text_a, text_b):
    skills_a = set(extract_skills(text_a))
    skills_b = set(extract_skills(text_b))
    if not skills_a and not skills_b:
        return 0.0, []
    overlap = sorted(skills_a & skills_b)
    union = skills_a | skills_b
    return len(overlap) / len(union), overlap


class RecruitmentNLP:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.sbert = SentenceTransformer(model_name)
        self.topic_model = None

    def fit(self, resumes, job_descriptions):
        all_texts = [text for text in resumes + job_descriptions if str(text).strip()]
        self.topic_model = BERTopic(
            embedding_model=self.sbert,
            nr_topics='auto',
            min_topic_size=8,
            verbose=True,
            calculate_probabilities=True,
        )
        self.topic_model.fit(all_texts)
        return self

    def get_topic_keywords(self, topic_id, top_n=8):
        if topic_id == -1 or not self.topic_model:
            return []
        words = self.topic_model.get_topic(topic_id) or []
        return [word for word, _ in words[:top_n]]

    def infer_domain(self, topic_id, text=''):
        keywords = set(self.get_topic_keywords(topic_id, top_n=10))
        keywords.update(token.lower() for token in extract_skills(text))
        if not keywords:
            return 'General'

        best_domain = 'General'
        best_score = 0
        for domain, hints in DOMAIN_HINTS.items():
            score = len(keywords & hints)
            if score > best_score:
                best_score = score
                best_domain = domain

        if best_score > 0:
            return best_domain

        top_words = self.get_topic_keywords(topic_id, top_n=2)
        if top_words:
            return ' / '.join(word.title() for word in top_words)
        return 'General'

    def topic_match_score(self, topic_a, topic_b, text_a='', text_b=''):
        keywords_a = set(self.get_topic_keywords(topic_a, top_n=10))
        keywords_b = set(self.get_topic_keywords(topic_b, top_n=10))

        if topic_a != -1 and topic_a == topic_b:
            return 1.0

        if keywords_a and keywords_b:
            union = keywords_a | keywords_b
            if union:
                return len(keywords_a & keywords_b) / len(union)

        fallback_tokens_a = set(preprocess(text_a)[:20])
        fallback_tokens_b = set(preprocess(text_b)[:20])
        union = fallback_tokens_a | fallback_tokens_b
        if not union:
            return 0.0
        return len(fallback_tokens_a & fallback_tokens_b) / len(union)

    def hybrid_score(self, resume_embedding, job_embedding, resume_text, job_text, resume_topic, job_topic):
        semantic = cosine_similarity_scratch(resume_embedding, job_embedding)
        skill_score, matched_skills = skill_overlap_score(resume_text, job_text)
        topic_score = self.topic_match_score(
            resume_topic,
            job_topic,
            text_a=resume_text,
            text_b=job_text,
        )
        final_score = (0.5 * semantic) + (0.3 * skill_score) + (0.2 * topic_score)
        return {
            'semantic_score': round(semantic, 4),
            'skill_score': round(skill_score, 4),
            'topic_score': round(topic_score, 4),
            'final_score': round(final_score, 4),
            'matched_skills': matched_skills,
        }

    def analyze_resume(self, text):
        embedding = self.sbert.encode(text).tolist()
        topic_id = -1
        confidence = 0.0
        if self.topic_model:
            topics, probabilities = self.topic_model.transform([text])
            topic_id = int(topics[0])
            if probabilities is not None and len(probabilities):
                row = probabilities[0]
                confidence = float(max(row)) if len(row) else 0.0

        keywords = self.get_topic_keywords(topic_id)
        return {
            'embedding': embedding,
            'topic_id': topic_id,
            'confidence': round(confidence, 4),
            'domain': self.infer_domain(topic_id, text),
            'keywords': keywords,
            'skills': extract_skills(text),
        }

    def rank_resumes_for_job(self, job_description, resumes):
        job_analysis = self.analyze_resume(job_description)
        results = []

        for resume in resumes:
            resume_embedding = resume.get('embedding') or self.sbert.encode(resume['text']).tolist()
            resume_topic = resume.get('topic_id', -1)
            scoring = self.hybrid_score(
                resume_embedding,
                job_analysis['embedding'],
                resume['text'],
                job_description,
                resume_topic,
                job_analysis['topic_id'],
            )
            results.append({
                'id': resume['id'],
                'name': resume['name'],
                'similarity_score': scoring['final_score'],
                'semantic_score': scoring['semantic_score'],
                'skill_score': scoring['skill_score'],
                'topic_score': scoring['topic_score'],
                'matched_skills': scoring['matched_skills'],
                'domain': self.infer_domain(resume_topic, resume['text']),
                'topic_keywords': self.get_topic_keywords(resume_topic),
            })

        return sorted(results, key=lambda item: item['similarity_score'], reverse=True)

    def match_jobs_for_resume(self, resume_text, jobs, resume_analysis=None):
        analysis = resume_analysis or self.analyze_resume(resume_text)
        results = []

        for job in jobs:
            job_embedding = job.get('embedding') or self.sbert.encode(job['description']).tolist()
            job_topic = job.get('topic_id', -1)
            scoring = self.hybrid_score(
                analysis['embedding'],
                job_embedding,
                resume_text,
                job['description'],
                analysis['topic_id'],
                job_topic,
            )
            results.append({
                'id': job['id'],
                'title': job['title'],
                'similarity_score': scoring['final_score'],
                'semantic_score': scoring['semantic_score'],
                'skill_score': scoring['skill_score'],
                'topic_score': scoring['topic_score'],
                'matched_skills': scoring['matched_skills'],
                'domain': self.infer_domain(job_topic, job['description']),
                'topic_keywords': self.get_topic_keywords(job_topic),
            })

        return sorted(results, key=lambda item: item['similarity_score'], reverse=True)

    def save(self, path='saved_model'):
        os.makedirs(path, exist_ok=True)
        if self.topic_model:
            self.topic_model.save(
                os.path.join(path, 'bertopic_model'),
                serialization='safetensors',
                save_ctfidf=True,
                save_embedding_model=False,
            )
        with open(os.path.join(path, 'config.json'), 'w', encoding='utf-8') as handle:
            json.dump({'sbert_model': 'all-MiniLM-L6-v2'}, handle)

    def load(self, path='saved_model'):
        bertopic_path = os.path.join(path, 'bertopic_model')
        if os.path.exists(bertopic_path):
            self.topic_model = BERTopic.load(bertopic_path, embedding_model=self.sbert)
        return self


def summarize_sections(text, limit=6):
    lines = [line.strip(' -\t') for line in str(text).splitlines() if line.strip()]
    candidates = []
    for line in lines:
        if 12 <= len(line) <= 140:
            candidates.append(line)
    return list(dict.fromkeys(candidates))[:limit]


def keyword_frequency_terms(text, limit=10):
    tokens = preprocess(text)
    counts = Counter(tokens)
    filtered = [
        token for token, count in counts.most_common(limit * 3)
        if len(token) > 2 and count >= 1
    ]
    return filtered[:limit]

