"""
30-day reflection: choice-based. Compare with baseline. Non-clinical.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.reflection_30d import (
    REFLECTION_QUESTIONS,
    ReflectionSubmit,
    ReflectionSummary,
    ReflectionCompare,
)


def _tendency(scores: dict) -> str:
    total = sum(scores.values()) if scores else 0
    n = len(scores) or 1
    avg = total / (n * 5.0)
    if avg <= 0.35:
        return "stable"
    if avg <= 0.65:
        return "mixed"
    return "low"


router = APIRouter(prefix="/reflection-30d", tags=["reflection"])


@router.get("/questions")
async def get_reflection_questions():
    return {"questions": REFLECTION_QUESTIONS}


@router.post("", response_model=ReflectionSummary)
async def submit_reflection(
    data: ReflectionSubmit,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    summary_scores = {c.question_id: c.choice_index for c in data.choices}
    tendency = _tendency(summary_scores)
    doc = {
        "user_id": user_id,
        "summary_scores": summary_scores,
        "overall_tendency": tendency,
        "created_at": now,
    }
    await db.reflection_30d.insert_one(doc)
    return ReflectionSummary(
        created_at=now,
        summary_scores=summary_scores,
        overall_tendency=tendency,
    )


@router.get("/latest", response_model=ReflectionSummary | None)
async def get_latest_reflection(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    cursor = db.reflection_30d.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    doc = docs[0] if docs else None
    if not doc:
        return None
    return ReflectionSummary(
        created_at=doc["created_at"],
        summary_scores=doc.get("summary_scores", {}),
        overall_tendency=doc.get("overall_tendency", "stable"),
    )


@router.get("/compare", response_model=ReflectionCompare)
async def compare_with_baseline(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Gentle comparison: baseline vs latest reflection. Non-diagnostic."""
    baseline_cursor = db.emotional_baselines.find({"user_id": user_id}).sort("created_at", 1).limit(1)
    baseline_docs = await baseline_cursor.to_list(length=1)
    baseline_doc = baseline_docs[0] if baseline_docs else None

    refl_cursor = db.reflection_30d.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    refl_docs = await refl_cursor.to_list(length=1)
    refl_doc = refl_docs[0] if refl_docs else None

    baseline_tendency = baseline_doc.get("overall_tendency", "stable") if baseline_doc else "stable"
    baseline_at = baseline_doc.get("created_at") if baseline_doc else None
    reflection_tendency = refl_doc.get("overall_tendency", "stable") if refl_doc else "stable"
    reflection_at = refl_doc.get("created_at") if refl_doc else None

    # Calm, non-alarming message (no diagnosis)
    if not refl_doc:
        message = "When you're ready, complete a reflection to see how things have shifted over time."
    elif not baseline_doc:
        message = "You've shared how you're feeling now. If you add an initial baseline later, we can reflect together."
    elif baseline_tendency == reflection_tendency:
        message = "Your overall pattern has stayed similar over time. Small steps and self-care still matter."
    elif reflection_tendency == "stable":
        message = "Things seem a bit more steady lately. Keep doing what supports you."
    elif reflection_tendency == "mixed":
        message = "You're noticing some ups and downs. That's okay — we're here to support you."
    else:
        message = "Some days feel heavier. Remember you can reach out to someone you trust or take small, kind steps for yourself."

    return ReflectionCompare(
        baseline_tendency=baseline_tendency,
        reflection_tendency=reflection_tendency,
        baseline_at=baseline_at,
        reflection_at=reflection_at,
        message=message,
    )
