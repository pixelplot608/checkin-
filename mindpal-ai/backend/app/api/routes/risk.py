"""
Risk score routes.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.risk import RiskScore
from app.ai.risk_engine import compute_risk

router = APIRouter(prefix="/risk", tags=["Risk"])


@router.get("", response_model=RiskScore)
async def get_risk(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    return await compute_risk(db, user_id)


@router.get("/cached", response_model=RiskScore | None)
async def get_cached_risk(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    cursor = db.risk_scores.find({"user_id": user_id}).sort("updated_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    doc = docs[0] if docs else None
    if not doc:
        return None
    from app.models.risk import RiskLevel
    return RiskScore(
        level=RiskLevel(doc["level"]),
        score=doc["score"],
        factors=doc.get("factors", []),
        updated_at=doc.get("updated_at"),
    )
