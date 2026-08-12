import base64
import json
import os
from pathlib import Path
from typing import Literal, Optional

import anthropic
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

APP_DIR = Path(__file__).parent
MODEL_PATH = APP_DIR / "models" / "model.joblib"
VECTORIZER_PATH = APP_DIR / "models" / "vectorizer.joblib"
FRAUD_WATCH_PATH = APP_DIR / "fraud_watch_data.json"

app = FastAPI(title="TruthLens API")

# Allow the frontend origin(s). Set FRONTEND_ORIGIN env var in production,
# e.g. https://truthlens.vercel.app
allowed_origins = os.environ.get("FRONTEND_ORIGIN", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load ML classifier once at startup ---
classifier = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

# --- Load Fraud Watch content once at startup ---
with open(FRAUD_WATCH_PATH) as f:
    fraud_watch_content = json.load(f)

# --- Claude client ---
# Requires ANTHROPIC_API_KEY set in the environment. Do not hardcode a key here.
claude_client = anthropic.Anthropic() if os.environ.get("ANTHROPIC_API_KEY") else None
CLAUDE_MODEL = "claude-sonnet-5"


class AnalyzeRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"


class AnalyzeResponse(BaseModel):
    ml_verdict: Literal["phishing", "ham"]
    ml_confidence: float
    llm_verdict: Literal["high_risk", "uncertain", "likely_safe"]
    llm_confidence: float
    explanation: str
    limitations: str
    recommended_actions: list[str]


REASONING_SYSTEM_PROMPT = """You are the reasoning layer of TruthLens, a scam and \
misinformation analysis tool. You are given a piece of user-submitted text (and \
optionally an image) along with a separate machine learning classifier's verdict \
and confidence. Your job:

1. Independently assess whether the content shows signs of being a scam, phishing \
   attempt, or misinformation, considering both the text and image if present.
2. Explicitly reconcile your assessment with the ML classifier's verdict. If you \
   disagree, say so plainly and explain why the classifier likely got it wrong or \
   right (e.g. "the classifier was trained mainly on phishing text patterns, not \
   general misinformation, which is likely why it missed this").
3. State your own confidence honestly. If the content is ambiguous, say so, do not \
   present false certainty.
4. Always include a short "limitations" note about what this analysis cannot \
   verify (e.g. it cannot confirm real-world facts, check if a sender's phone \
   number is legitimate, or verify a person's identity).
5. Give 2-4 short, concrete recommended actions for the user.

Respond ONLY with a JSON object, no other text, matching this exact schema:
{
  "llm_verdict": "high_risk" | "uncertain" | "likely_safe",
  "llm_confidence": <float between 0 and 1>,
  "explanation": "<2-4 sentences, plain language, explain your reasoning and how it relates to the ML classifier's verdict>",
  "limitations": "<1-2 sentences on what this analysis cannot verify>",
  "recommended_actions": ["<action 1>", "<action 2>", "..."]
}
"""


def run_ml_classifier(text: str) -> tuple[str, float]:
    vec = vectorizer.transform([text])
    verdict = classifier.predict(vec)[0]
    confidence = float(max(classifier.predict_proba(vec)[0]))
    return verdict, confidence


def run_llm_reasoning(text: str, ml_verdict: str, ml_confidence: float,
                       image_base64: Optional[str], image_media_type: str) -> dict:
    if claude_client is None:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured on the server.",
        )

    user_content = [
        {
            "type": "text",
            "text": (
                f"ML classifier verdict: {ml_verdict} (confidence: {ml_confidence:.2f})\n\n"
                f"Content to analyze:\n{text}"
            ),
        }
    ]
    if image_base64:
        user_content.insert(0, {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_media_type,
                "data": image_base64,
            },
        })

    response = claude_client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=600,
        system=REASONING_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    # Strip accidental code fences if the model adds them
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Could not parse reasoning layer output.")


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text field is required.")

    ml_verdict, ml_confidence = run_ml_classifier(req.text)
    llm_result = run_llm_reasoning(
        req.text, ml_verdict, ml_confidence, req.image_base64, req.image_media_type
    )

    return AnalyzeResponse(
        ml_verdict=ml_verdict,
        ml_confidence=round(ml_confidence, 3),
        llm_verdict=llm_result["llm_verdict"],
        llm_confidence=round(float(llm_result["llm_confidence"]), 3),
        explanation=llm_result["explanation"],
        limitations=llm_result["limitations"],
        recommended_actions=llm_result["recommended_actions"],
    )


@app.get("/fraud-watch")
def fraud_watch():
    return fraud_watch_content


@app.get("/health")
def health():
    return {"status": "ok", "claude_configured": claude_client is not None}
