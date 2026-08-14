# TruthLens — Build Brief

A misinformation & scam-content analyzer with a "Fraud Watch" awareness hub.
Built for: ML Empowerment Build Challenge 2.0 (Devpost) — deadline Aug 15, 2026, 9:45am GMT+3.

## 1. Concept

TruthLens is not a chatbot. It's a two-page web app:
- **Analyzer**: paste text or upload an image → get a structured verdict card (risk score,
  confidence, explanation, stated limitations, recommended next steps).
- **Fraud Watch**: a browsable, categorized hub of current scam/misinformation tactics with
  red flags and prevention tips — the "return and share" feature that turns this from a
  one-off tool into something with lasting value.

The core technical thesis: a trained ML classifier gives fast, evidence-backed pattern
detection, but is narrow (it's only as good as its training distribution). An LLM reasoning
layer sits on top to catch what the classifier misses, and — critically — states its own
confidence and limitations rather than presenting a false sense of certainty. This
reconciliation between two independent signals (not just "ask an LLM") is the differentiator.

## 2. Judging alignment (Technical 30% / Creativity 20% / Impact 20% / UX 15% / Presentation 15%)

- Technical: real trained model with reported metrics + LLM integration + reconciliation logic
- Creativity: two-signal reconciliation is not a common hackathon pattern; Fraud Watch hub
  adds a preventive-education angle most "detector" submissions skip
- Impact: misinformation/scams are a global problem; Fraud Watch drives repeat engagement
- UX: purpose-built interface (verdict cards, category hub), not a bare chat window
- Presentation: explicitly cite which AI Literacy Foundation lessons each component reflects
  (Lesson 5 data/bias, Lesson 7 neural nets/pattern detection, Lesson 8 LLM limitations,
  Lesson 9 multimodal, Lesson 10 prompt engineering, Lesson 11 ethics/misinformation)

## 3. System architecture

User → Frontend (React + Tailwind) → Backend API (FastAPI) →
  - ML classifier (local inference, joblib model)
  - Gemini API (reasoning/explanation, vision when image present, and Fraud Watch content gen)
Backend returns merged verdict → Frontend renders card.
Fraud Watch entries are served from a structured content store in the backend.

## 4. Tech stack

- Frontend: React (Vite) + Tailwind CSS → deploy on Vercel
- Backend: FastAPI (Python) → deploy on Railway (preferred, avoids Render free-tier cold
  starts that could hurt a live demo) or Render as fallback
- ML: scikit-learn (TF-IDF + Logistic Regression), already trained
- LLM: Gemini API (vision-capable model) for reasoning + content generation
- Communication: REST/JSON, CORS enabled

## 5. Data & model (already validated)

- Dataset: `angelfonsecar/phishing-compilation` on GitHub — compiled from 6 public sources
  (Enron, SMS Spam Collection/UCI, Kaggle phishing email sets). 44,462 train rows / 9,527
  validation rows, labeled `ham` vs `phishing`.
- Model: TF-IDF (15,000 features, 1–2 grams, English stopwords) + Logistic Regression
  (balanced class weights).
- Validation accuracy: **97.9%** (precision/recall ~0.97–0.99 both classes).
- Known limitation found in testing: the classifier misjudged a fake-news/clickbait-style
  claim (67% confidence, wrong label) because it's trained on phishing patterns, not general
  misinformation. This is a real, reproducible example — use it directly in the pitch as
  evidence for why the LLM reconciliation layer exists, not a hypothetical.
- Saved artifacts: `model.joblib`, `vectorizer.joblib`

## 6. Backend API contract

`POST /analyze`
```
request:  { "text": string, "image_base64": string | null }
response: {
  "ml_verdict": "phishing" | "ham",
  "ml_confidence": float,
  "llm_verdict": "high_risk" | "uncertain" | "likely_safe",
  "llm_confidence": float,
  "explanation": string,
  "limitations": string,
  "recommended_actions": [string]
}
```

`GET /fraud-watch`
```
response: {
  "categories": [ { "id": string, "name": string } ],
  "entries": [
    {
      "id": string, "category_id": string, "title": string,
      "summary": string, "red_flags": [string],
      "prevention_tips": [string], "last_updated": string
    }
  ]
}
```

## 7. Frontend pages

- **Analyzer**: text input, image upload, Analyze button, color-coded verdict card,
  confidence bar, expandable "why" and "limitations" sections
- **Fraud Watch**: category filter chips, searchable card grid
- **(optional) About / How it works**: short architecture + ethics transparency note —
  cheap to add, strong for Presentation & Documentation scoring

## 8. Fraud Watch content plan (categories to write, ~8–10 entries)

AI voice-cloning scams, deepfake video scams, romance scams, investment/crypto scams,
job/recruitment scams, QR-code ("quishing") scams, phishing/smishing, package-delivery
scams, tech-support scams, tax/government impersonation scams.

## 9. Build order

1. ✅ Classifier trained and validated
2. Backend: FastAPI skeleton + `/analyze` (ML + Gemini integration)
3. Backend: `/fraud-watch` + seed content (8–10 entries)
4. Frontend: Analyzer page wired to backend
5. Frontend: Fraud Watch page wired to backend
6. Polish UI/UX, responsive check
7. Deploy backend (Railway) + frontend (Vercel)
8. End-to-end test with real examples
9. Record demo video, write Devpost description, screenshots
10. Submit with buffer before Aug 15, 9:45am GMT+3

## 10. Devpost submission checklist

- Project title
- Description: problem statement, solution overview, key features, technologies used,
  target users
- Screenshots/video showing functionality
- Repo link (GitHub)
- Team details (solo)
