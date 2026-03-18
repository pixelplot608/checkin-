"""
Journal / text sentiment routes.

Upgraded to include:
- sentiment + emotion detection
- derived stress level
- risk level via existing risk engine
- local Ollama (llama3) analysis for a short, gentle AI insight.

All other behaviour (privacy, storage) remains unchanged.
"""
from datetime import datetime

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_id
from app.database import get_db
from app.models.journal import JournalCreate, JournalEntry
from app.ai.sentiment import analyze_sentiment
from app.ai.risk_engine import compute_risk

router = APIRouter(prefix="/journal", tags=["journal"])


def _derive_stress_level(text: str, sentiment_score: float) -> tuple[float, str]:
    """
    Weighted stress scoring using keywords + sentiment magnitude.

    anxiety words → +0.35
    pressure / overload → +0.25
    fatigue → +0.15
    sadness → +0.15
    calm / neutral → −0.20

    Normalised to 0–1, then mapped:
      >= 0.75 → high
      0.45–0.74 → medium
      < 0.45 → low
    """
    t = text.lower()
    score = 0.0

    anxiety_words = ("anxious", "anxiety", "worried", "nervous", "panic", "panicky")
    pressure_words = ("pressure", "overload", "too much", "stressed out", "rush", "deadline")
    fatigue_words = ("tired", "exhausted", "drained", "burned out", "burnt out", "fatigued")
    sadness_words = ("sad", "down", "upset", "lonely", "hopeless", "blue")
    calm_words = ("calm", "peaceful", "okay", "ok", "fine", "relaxed")

    if any(w in t for w in anxiety_words):
        score += 0.35
    if any(w in t for w in pressure_words):
        score += 0.25
    if any(w in t for w in fatigue_words):
        score += 0.15
    if any(w in t for w in sadness_words):
        score += 0.15
    if any(w in t for w in calm_words):
        score -= 0.20

    # Sentiment magnitude nudges stress slightly but does not dominate.
    score += max(0.0, -sentiment_score) * 0.25

    # Normalise to 0–1
    score = max(0.0, min(1.0, score))

    if score >= 0.75:
        level = "high"
    elif score >= 0.45:
        level = "medium"
    else:
        level = "low"

    return score, level


def _derive_fatigue_level(user_text: str) -> str:
    """
    Mental fatigue detector, independent of stress.

    Detects: tired, drained, heavy, slow, low energy, sleepy, mentally exhausted.
    Returns: none / mild / moderate / high.
    """
    text = user_text.lower()
    high_words = ("mentally exhausted", "completely exhausted", "burned out", "burnt out", "drained")
    moderate_words = ("very tired", "so tired", "exhausted", "worn out", "heavy")
    mild_words = ("tired", "sleepy", "low energy", "sluggish", "slow")

    if any(w in text for w in high_words):
        return "high"
    if any(w in text for w in moderate_words):
        return "moderate"
    if any(w in text for w in mild_words):
        return "mild"
    return "none"


@router.post("", response_model=JournalEntry)
async def create_journal(
    data: JournalCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    result = analyze_sentiment(data.text)
    sentiment_score = result["sentiment_score"]
    emotion_label = result.get("emotion_label")

    stress_score, stress_level = _derive_stress_level(data.text, sentiment_score)
    fatigue_level = _derive_fatigue_level(data.text)

    # Use existing risk engine (no changes) to compute current risk level.
    risk = await compute_risk(db, user_id)
    risk_level = risk.level.value

    # Silent AI mode: do not return or store AI paragraphs for the UI.
    ai_insight = None

    now = datetime.utcnow()
    # When store_emotion_only=True we do not persist text (privacy-first).
    doc = {
        "user_id": user_id,
        "text": None if data.store_emotion_only else data.text,
        "sentiment_score": sentiment_score,
        "emotion_label": emotion_label,
        "stress_level": stress_level,
        "risk_level": risk_level,
        # Lightweight cross-feature emotional state for companion:
        "last_journal_emotion": emotion_label,
        "last_journal_stress": stress_level,
        "last_journal_fatigue": fatigue_level,
        "last_journal_risk": risk_level,
        "last_journal_strength": float(
            max(0.0, min(1.0, (abs(sentiment_score) * 0.5) + (stress_score * 0.5)))
        ),
        "ai_insight": ai_insight,
        "created_at": now,
    }
    r = await db.journal_entries.insert_one(doc)
    return JournalEntry(
        id=str(r.inserted_id),
        user_id=user_id,
        text=doc["text"],
        sentiment_score=sentiment_score,
        emotion_label=emotion_label,
        stress_level=stress_level,
        risk_level=risk_level,
        ai_insight=ai_insight,
        created_at=now,
    )


@router.get("", response_model=list[JournalEntry])
async def list_journal(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    out: list[JournalEntry] = []
    async for doc in db.journal_entries.find({"user_id": user_id}).sort("created_at", -1).limit(limit):
        out.append(
            JournalEntry(
                id=str(doc["_id"]),
                user_id=doc["user_id"],
                text=doc.get("text"),  # None for emotion-only entries
                sentiment_score=doc["sentiment_score"],
                emotion_label=doc.get("emotion_label"),
                stress_level=doc.get("stress_level"),
                risk_level=doc.get("risk_level"),
                ai_insight=doc.get("ai_insight"),
                created_at=doc.get("created_at"),
            )
        )
    return out
