# TruthLens

A misinformation & scam-content analyzer with a Fraud Watch awareness hub.
Built for the ML Empowerment Build Challenge 2.0.

## What's here

- `backend/` — FastAPI service: trained scam classifier (97.9% validation accuracy)
  + Gemini API reasoning layer + Fraud Watch content
- `frontend/` — React + Vite + Tailwind app: Analyzer page + Fraud Watch page
- `BUILD_BRIEF.md` — full architecture, API contracts, and submission notes
- `train_baseline.py` — the script that trained the classifier 
## Run it locally

### Backend
```
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your GEMINI_API_KEY
uvicorn main:app --reload
```
Runs at http://localhost:8000. Check http://localhost:8000/health — `gemini_configured`
should say `true` once your key is set.

### Frontend
```
cd frontend
npm install
npm run dev
```
Runs at http://localhost:5173, calls the backend at http://localhost:8000 by default
(see `VITE_API_URL` in a `.env` file if you need to point elsewhere).

## Deployed 
**Backend on Render** 


**Frontend on Vercel**:

