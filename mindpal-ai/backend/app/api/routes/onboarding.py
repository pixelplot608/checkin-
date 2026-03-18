"""
Onboarding routes for personal profile.
Non-invasive: separate collection, does not touch auth/risk/user core models.
"""
from datetime import datetime

from fastapi import APIRouter, Depends

from app.database import get_db
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/profile")
async def get_onboarding_profile(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Return minimal onboarding profile state.
    If no record exists, treat as not completed.
    """
    doc = await db.onboarding_profiles.find_one({"user_id": user_id})
    if not doc:
        return {
            "personal_profile_completed": False,
            "consent_given": False,
            "questions_completed": False,
        }
    return {
        "personal_profile_completed": bool(doc.get("personal_profile_completed", False)),
        "consent_given": bool(doc.get("consent_given", False)),
        "questions_completed": bool(doc.get("questions_completed", False)),
    }


@router.post("/personal")
async def save_personal_info(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Save simplified personal information.
    Mark personal_profile_completed = True only when both name and age_range are present.
    """
    doc = await db.onboarding_profiles.find_one({"user_id": user_id}) or {"user_id": user_id}
    name = payload.get("name") or doc.get("name")
    age_range = payload.get("age_range") or doc.get("age_range")
    gender = payload.get("gender", doc.get("gender"))
    occupation = payload.get("occupation") or doc.get("occupation")

    personal_complete = bool(name) and bool(age_range)

    doc.update(
        {
            "name": name,
            "age_range": age_range,
            "gender": gender,
            "occupation": occupation,
            "personal_profile_completed": personal_complete,
            # Always keep consent/questions flags present in the document
            "consent_given": bool(doc.get("consent_given", False)),
            "questions_completed": bool(doc.get("questions_completed", False)),
            "updated_at": datetime.utcnow(),
        }
    )
    await db.onboarding_profiles.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "personal_profile_completed": personal_complete}


@router.post("/consent")
async def save_onboarding_consent(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Mark safety / onboarding consent as given.
    """
    doc = await db.onboarding_profiles.find_one({"user_id": user_id}) or {"user_id": user_id}
    doc.update(
        {
            "consent_given": True,
            "updated_at": datetime.utcnow(),
        }
    )
    await db.onboarding_profiles.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "consent_given": True}


@router.post("/questions")
async def save_onboarding_questions(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Legacy endpoint kept for compatibility.
    No schema changes beyond questions_completed flag.
    """
    doc = await db.onboarding_profiles.find_one({"user_id": user_id}) or {"user_id": user_id}
    doc.update(
        {
            "questions_completed": True,
            "updated_at": datetime.utcnow(),
        }
    )
    await db.onboarding_profiles.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "questions_completed": True}


@router.post("/questions-complete")
async def mark_questions_complete(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Explicit endpoint to mark onboarding questions as completed.
    Only flips questions_completed flag; no other logic.
    """
    doc = await db.onboarding_profiles.find_one({"user_id": user_id}) or {"user_id": user_id}
    doc.update(
        {
            "questions_completed": True,
            "updated_at": datetime.utcnow(),
        }
    )
    await db.onboarding_profiles.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "questions_completed": True}


@router.post("/reset")
async def reset_onboarding_profile(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Dev-only helper: mark profile as incomplete again.
    Safe no-op in production if unused.
    """
    await db.onboarding_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "personal_profile_completed": False, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True, "personal_profile_completed": False}

