# NLP-mini-project
RecruitSphere (Hiring and Recruitment)
A smart, AI-powered platform that matches resumes with job descriptions using semantic understanding instead of simple keyword filtering.

Most traditional resume screening systems rely on keyword matching. This often leads to qualified candidates being rejected just because they didn’t use exact words.

This project solves that problem by using Natural Language Processing (NLP) to understand the meaning behind resumes and job descriptions.

It helps:

👨‍💼 Recruiters find better candidates
👩‍💻 Job seekers discover more relevant jobs
✨ Key Features
🔍 Semantic Matching (AI-Based)

Uses Sentence-BERT to understand context, not just keywords.
Hybrid Scoring System Combines:
  Semantic similarity
  Skill matching
  Domain/topic matching

Skill Extraction
Identifies technical skills from resumes automatically.
Bi-Directional Use
Recruiters → Rank candidates
Candidates → Get job recommendations

Real-Time Processing
Fast scoring using a dedicated NLP microservice.

Tech Stack:
Frontend
React.js
Vite
CSS
Backend
Node.js
Express.js
AI / NLP Service
Python
FastAPI
Sentence-BERT (all-MiniLM-L6-v2)
SpaCy
BERTopic
Database
MongoDB
Other Tools
Multer (file uploads)
pdf2json (resume parsing)

How It Works?
User uploads theri information.
NLP service processes:
Extracts skills
Generates embeddings
Job description is also processed
System calculates Hybrid Score
Results are displayed as ranked matches

Scoring Logic

The system uses a Hybrid Score:

50% → Semantic Similarity (meaning-based)
30% → Skill Matching
20% → Topic/Domain Matching

This ensures more accurate and fair results compared to traditional systems.

Project Architecture
Frontend (React) → User interface
Backend (Node.js) → API & authentication
NLP Service (Python) → AI processing

These components communicate through APIs in a microservices architecture.

📁 Main Modules
Authentication & User Management
Candidate Dashboard
Recruiter Dashboard
Resume Processing Engine
NLP Scoring Engine

⚙️ Installation & Setup

1. Clone the repository
git clone https://github.com/Sabriya07/NLP-mini-project
cd NLP-mini-project

3. Setup Backend (Node.js)
cd server
npm install
npm start

5. Setup NLP Service (Python)
cd nlp-service
pip install -r requirements.txt
uvicorn app:app --reload

7. Setup Frontend
cd client
npm install
npm run dev

Future Improvements
Support for non-IT domains
OCR for image-based resumes
Bias reduction in scoring
Interview scheduling integration

Use Cases
College placement systems
Recruitment platforms
Job portals
Resume screening tools
⭐ Final Note

This project demonstrates how AI can improve recruitment by making it smarter, fairer, and more efficient.
