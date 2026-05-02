import os

import pandas as pd

from nlp_model import RecruitmentNLP

CSV_PATH = 'data/recruitement-dataset.csv'
SAVE_PATH = 'saved_model'

os.makedirs(SAVE_PATH, exist_ok=True)

print('Loading dataset...')
dataframe = pd.read_csv(CSV_PATH).dropna(subset=['Resume', 'Job Description'])
resumes = dataframe['Resume'].astype(str).tolist()
job_descriptions = dataframe['Job Description'].astype(str).tolist()

role_count = dataframe['Job Roles'].nunique() if 'Job Roles' in dataframe.columns else 'unknown'
print(f'Loaded {len(resumes)} resumes and {len(job_descriptions)} job descriptions across {role_count} roles')

model = RecruitmentNLP()
model.fit(resumes, job_descriptions)

print('\nTop Topics:')
for topic_id in model.topic_model.get_topics():
    if topic_id == -1:
        continue
    keywords = model.get_topic_keywords(topic_id, top_n=6)
    print(f'  Topic {topic_id:02d}: {", ".join(keywords)} -> {model.infer_domain(topic_id)}')

model.save(SAVE_PATH)
print('\nTraining complete. Start the API with: uvicorn app:app --host 0.0.0.0 --port 5001 --reload')
