"""
Baseline / PHQ-9 routes.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.baseline import PHQ9Create, BaselineSummary, PHQ9_QUESTIONS

router = APIRouter(prefix="/baseline", tags=["Baseline"])


def _severity(total: int) -> str:
    if total <= 4:
        return "minimal"
    if total <= 9:
        return "mild"
    if total <= 14:
        return "moderate"
    if total <= 19:
        return "moderately_severe"
    return "severe"


@router.get("/phq9-questions")
async def get_phq9_questions():
    return {"questions": PHQ9_QUESTIONS}


@router.post("/phq9", response_model=BaselineSummary)
async def submit_phq9(data: PHQ9Create, user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    total = sum(a.value for a in data.answers)
    severity = _severity(total)
    from datetime import datetime
    doc = {
        "user_id": user_id,
        "total_score": total,
        "answers": [{"q": a.question_index, "v": a.value} for a in data.answers],
        "severity": severity,
        "created_at": datetime.utcnow(),
    }
    await db.phq9.insert_one(doc)
    return BaselineSummary(
        total_score=total,
        created_at=doc["created_at"],
        severity=severity,
    )


@router.get("/phq9/latest", response_model=BaselineSummary | None)
async def get_latest_phq9(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    cursor = db.phq9.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    doc = docs[0] if docs else None
    if not doc:
        return None
    return BaselineSummary(
        total_score=doc["total_score"],
        created_at=doc["created_at"],
        severity=doc["severity"],
    )
