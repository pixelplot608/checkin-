"""
Privacy & consent. Non-medical, user-controlled.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.consent import ConsentAccept, ConsentStatus

router = APIRouter(prefix="/consent", tags=["consent"])


@router.post("", response_model=ConsentStatus)
async def accept_consent(
    data: ConsentAccept,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Record that user accepted privacy/consent. No medical language."""
    now = datetime.utcnow()
    await db.consent.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "accepted": data.accepted, "accepted_at": now, "consent_version": data.consent_version}},
        upsert=True,
    )
    return ConsentStatus(accepted=data.accepted, accepted_at=now, consent_version=data.consent_version)


@router.get("", response_model=ConsentStatus)
async def get_consent(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Get current consent status. Returns accepted=false when not yet accepted."""
    doc = await db.consent.find_one({"user_id": user_id})
    if not doc:
        return ConsentStatus(accepted=False, accepted_at=None, consent_version=None)
    return ConsentStatus(
        accepted=doc.get("accepted", False),
        accepted_at=doc.get("accepted_at"),
        consent_version=doc.get("consent_version"),
    )
