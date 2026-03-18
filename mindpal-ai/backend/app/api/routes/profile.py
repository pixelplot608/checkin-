"""
Profile routes: combined view and update of user profile (no schema change).
Uses existing users collection and read-only data from baseline, trusted_contact.
"""
from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.database import get_db
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdateBody(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None  # city


@router.get("/me")
async def get_profile_me(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
) -> dict[str, Any]:
    """Return combined profile: user, onboarding, baseline, phq9, trusted contact (read-only)."""
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        oid = user_id
    user = await db.users.find_one({"_id": oid})
    if not user:
        return {}
    uid = str(user["_id"])
    # Username: derive from email
    email = user.get("email") or ""
    username = email.split("@")[0] if email else ""
    joined_at = user.get("created_at")
    joined_date = joined_at.isoformat()[:10] if isinstance(joined_at, datetime) else (str(joined_at)[:10] if joined_at else None)

    # Onboarding / extended profile (may have age_range, etc.)
    onboarding = await db.onboarding_profiles.find_one({"user_id": user_id})
    age = (onboarding.get("age_range") if onboarding else None) or user.get("age")
    gender = (onboarding.get("gender") if onboarding else None) or user.get("gender")
    # Prefer user doc for editable fields (so PUT can write there)
    full_name = user.get("full_name") or (onboarding.get("name") if onboarding else None)
    phone = user.get("phone")
    date_of_birth = user.get("date_of_birth")
    location = user.get("location") or user.get("city")

    # Emotional baseline (read-only)
    baseline_cursor = db.emotional_baselines.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    baseline_docs = await baseline_cursor.to_list(length=1)
    baseline_doc = baseline_docs[0] if baseline_docs else None
    emotional_baseline = None
    if baseline_doc:
        emotional_baseline = baseline_doc.get("overall_tendency") or "—"

    # PHQ-9 (read-only)
    phq_cursor = db.phq9.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    phq_docs = await phq_cursor.to_list(length=1)
    phq_doc = phq_docs[0] if phq_docs else None
    phq9_score = None
    if phq_doc is not None:
        phq9_score = phq_doc.get("total_score")

    # Trusted contact (read-only on profile)
    tc = await db.trusted_contacts.find_one({"user_id": user_id})
    trusted_contact = None
    if tc and (tc.get("name") or tc.get("email") or tc.get("phone")):
        trusted_contact = {
            "name": tc.get("name"),
            "relation": tc.get("relation"),
            "phone": tc.get("phone"),
            "email": tc.get("email"),
        }

    return {
        "id": uid,
        "full_name": full_name or "",
        "username": username,
        "email": email,
        "phone": phone or "",
        "age": age or "",
        "gender": gender or "",
        "date_of_birth": date_of_birth or "",
        "location": location or "",
        "emotional_baseline": emotional_baseline,
        "phq9_score": phq9_score,
        "joined_date": joined_date,
        "trusted_contact": trusted_contact,
    }


@router.put("/update")
async def update_profile(
    data: ProfileUpdateBody,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Update editable profile fields only (stored in users collection)."""
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        oid = user_id
    update: dict[str, Any] = {}
    if data.full_name is not None:
        update["full_name"] = data.full_name
    if data.phone is not None:
        update["phone"] = data.phone
    if data.age is not None:
        update["age"] = data.age
    if data.gender is not None:
        update["gender"] = data.gender
    if data.date_of_birth is not None:
        update["date_of_birth"] = data.date_of_birth
    if data.location is not None:
        update["location"] = data.location
    if not update:
        return {"ok": True}
    update["updated_at"] = datetime.utcnow()
    await db.users.update_one({"_id": oid}, {"$set": update})
    return {"ok": True}
