import base64
import json
import os
from pathlib import Path
from typing import Literal, Optional

import joblib
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

load_dotenv()

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

# --- Gemini client ---
# Requires GEMINI_API_KEY set in the environment (free via Google AI Studio,
# no card required). Do not hardcode a key here.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
# Gemini model IDs get deprecated/rotated frequently. Override via GEMINI_MODEL
# in .env if this default ever 404s — check aistudio.google.com, pick a model,
# click "Get code", and copy the exact model= string shown there.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")


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
    reasoning_source: Literal["llm", "ml_only"] = "llm"


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


@retry(
    retry=retry_if_exception_type(genai.errors.ServerError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=8),
    reraise=True,
)
def _call_gemini(contents, config):
    return gemini_client.models.generate_content(
        model=GEMINI_MODEL, contents=contents, config=config
    )


def run_llm_reasoning(text: str, ml_verdict: str, ml_confidence: float,
                       image_base64: Optional[str], image_media_type: str) -> dict:
    if gemini_client is None:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    contents = [
        f"ML classifier verdict: {ml_verdict} (confidence: {ml_confidence:.2f})\n\n"
        f"Content to analyze:\n{text}"
    ]
    if image_base64:
        contents.append(
            types.Part.from_bytes(
                data=base64.b64decode(image_base64),
                mime_type=image_media_type,
            )
        )

    config = types.GenerateContentConfig(
        system_instruction=REASONING_SYSTEM_PROMPT,
        response_mime_type="application/json",
        max_output_tokens=3072,
    )

    try:
        response = _call_gemini(contents, config)
    except genai.errors.APIError as e:
        # Retries (if applicable) are already exhausted by this point.
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    raw = (response.text or "").strip()
    if not raw:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty response (it may have used its full "
                   "token budget on internal reasoning). Try again.",
        )
    # Strip accidental code fences just in case
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse reasoning layer output. Raw response: {raw[:300]}",
        )


def build_fallback_result(ml_verdict: str, ml_confidence: float) -> dict:
    """Used when the LLM reasoning layer is unavailable for any reason. Never
    claims 'likely_safe' on its own — without independent reasoning, the
    honest stance is 'high_risk' or 'uncertain', never a confident all-clear.
    """
    llm_verdict = "high_risk" if ml_verdict == "phishing" else "uncertain"
    return {
        "llm_verdict": llm_verdict,
        "llm_confidence": ml_confidence,
        "explanation": (
            "The AI reasoning layer is temporarily unavailable, so this result is "
            f"based only on the pattern-matching classifier, which flagged this "
            f"content as '{ml_verdict}' with {ml_confidence:.0%} confidence. This is "
            "a narrower signal than TruthLens normally provides."
        ),
        "limitations": (
            "This fallback result has not been independently reasoned over. It "
            "reflects statistical text patterns only and is known to be less "
            "reliable on content like general misinformation, which falls outside "
            "typical scam/phishing wording. Treat it as a starting signal, not a "
            "final verdict."
        ),
        "recommended_actions": [
            "Don't click links, share personal info, or send money based on this alone.",
            "Try analyzing again shortly — the reasoning layer may recover.",
            "When in doubt, verify directly with the sender or organization through "
            "a separate, trusted channel.",
        ],
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text field is required.")

    ml_verdict, ml_confidence = run_ml_classifier(req.text)

    reasoning_source = "llm"
    try:
        llm_result = run_llm_reasoning(
            req.text, ml_verdict, ml_confidence, req.image_base64, req.image_media_type
        )
    except Exception:
        # The reasoning layer failed for any reason (missing key, Gemini outage,
        # bad model ID, malformed output, etc). Never surface a broken error to
        # the user — fall back to an honest, classifier-only result instead.
        llm_result = build_fallback_result(ml_verdict, ml_confidence)
        reasoning_source = "ml_only"

    return AnalyzeResponse(
        ml_verdict=ml_verdict,
        ml_confidence=round(ml_confidence, 3),
        llm_verdict=llm_result["llm_verdict"],
        llm_confidence=round(float(llm_result["llm_confidence"]), 3),
        explanation=llm_result["explanation"],
        limitations=llm_result["limitations"],
        recommended_actions=llm_result["recommended_actions"],
        reasoning_source=reasoning_source,
    )


@app.get("/fraud-watch")
def fraud_watch():
    return fraud_watch_content


@app.get("/health")
def health():
    return {"status": "ok", "gemini_configured": gemini_client is not None}
