"""
Choice-based emotional baseline. Non-clinical, introvert-friendly.
Stored for 30-day reflection comparison. No diagnosis.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.emotional_baseline import (
    EmotionalBaselineCreate,
    EmotionalBaselineSummary,
    BASELINE_QUESTIONS,
)

router = APIRouter(prefix="/emotional-baseline", tags=["baseline"])


def _overall_tendency(scores: dict) -> str:
    """Internal only: stable, mixed, or low. Never shown as diagnosis."""
    total = sum(scores.values()) if scores else 0
    n = len(scores) or 1
    avg = total / (n * 5.0)  # normalize 0-1
    if avg <= 0.35:
        return "stable"
    if avg <= 0.65:
        return "mixed"
    return "low"


@router.get("/questions")
async def get_baseline_questions():
    """Choice-based, non-clinical questions for initial baseline."""
    return {"questions": BASELINE_QUESTIONS}


@router.post("", response_model=EmotionalBaselineSummary)
async def submit_emotional_baseline(
    data: EmotionalBaselineCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Store choice-based baseline. No medical language."""
    now = datetime.utcnow()
    summary_scores = {c.question_id: c.choice_index for c in data.choices}
    tendency = _overall_tendency(summary_scores)
    doc = {
        "user_id": user_id,
        "summary_scores": summary_scores,
        "overall_tendency": tendency,
        "created_at": now,
    }
    await db.emotional_baselines.insert_one(doc)
    return EmotionalBaselineSummary(
        created_at=now,
        summary_scores=summary_scores,
        overall_tendency=tendency,
    )


@router.get("/latest", response_model=EmotionalBaselineSummary | None)
async def get_latest_baseline(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Latest baseline for 30-day comparison. Internal use."""
    cursor = db.emotional_baselines.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    doc = docs[0] if docs else None
    if not doc:
        return None
    return EmotionalBaselineSummary(
        created_at=doc["created_at"],
        summary_scores=doc.get("summary_scores", {}),
        overall_tendency=doc.get("overall_tendency", "stable"),
    )
