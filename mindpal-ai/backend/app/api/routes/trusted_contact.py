"""
Optional trusted contact. User-controlled; used only for gentle escalation with consent.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.trusted_contact import TrustedContactCreate, TrustedContactResponse

router = APIRouter(prefix="/trusted-contact", tags=["trusted-contact"])


@router.post("", response_model=TrustedContactResponse)
async def set_trusted_contact(
    data: TrustedContactCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Optionally set a trusted contact. Stored only if user provides; never shared without consent."""
    doc = {
        "user_id": user_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "relation": data.relation,
        "consent_to_contact": data.consent_to_contact,
    }
    await db.trusted_contacts.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return TrustedContactResponse(
        has_contact=bool(data.name or data.email or data.phone),
        name=data.name,
        relation=data.relation,
        consent_to_contact=data.consent_to_contact,
    )


@router.get("", response_model=TrustedContactResponse)
async def get_trusted_contact(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Get trusted contact (safe fields only)."""
    doc = await db.trusted_contacts.find_one({"user_id": user_id})
    if not doc:
        return TrustedContactResponse(has_contact=False)
    return TrustedContactResponse(
        has_contact=bool(doc.get("name") or doc.get("email") or doc.get("phone")),
        name=doc.get("name"),
        relation=doc.get("relation"),
        consent_to_contact=doc.get("consent_to_contact", False),
    )
