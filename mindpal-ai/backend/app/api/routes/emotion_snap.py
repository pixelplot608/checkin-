"""
Emotion snap (face) and streak routes.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, UploadFile, File
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.emotion_snap import EmotionSnapCreate, EmotionSnap
from app.ai.emotion_face import detect_emotion_from_image

router = APIRouter(prefix="/emotion", tags=["emotion"])


@router.post("/snap", response_model=EmotionSnap)
async def create_emotion_snap(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
    file: UploadFile | None = File(None),
):
    """Upload image or send no file for demo (simulated emotion)."""
    image_bytes = await file.read() if file and file.filename else None
    result = detect_emotion_from_image(image_bytes)
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "emotion": result["emotion"],
        "confidence": result["confidence"],
        "source": "snap",
        "created_at": now,
    }
    r = await db.emotion_snaps.insert_one(doc)
    return EmotionSnap(
        id=str(r.inserted_id),
        user_id=user_id,
        emotion=doc["emotion"],
        confidence=doc["confidence"],
        source=doc["source"],
        created_at=now,
    )


@router.post("/snap/json", response_model=EmotionSnap)
async def create_emotion_snap_json(
    data: EmotionSnapCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Submit emotion from client (e.g. after client-side face model). Updates forest growth + color."""
    now = datetime.utcnow()
    color = getattr(data, "color", None) or "#4CAF50"
    doc = {
        "user_id": user_id,
        "emotion": data.emotion.value,
        "confidence": data.confidence,
        "source": "snap",
        "created_at": now,
    }
    r = await db.emotion_snaps.insert_one(doc)
    await db.forest_state.update_one(
        {"user_id": user_id},
        {"$inc": {"growth": 1}, "$set": {"last_color": color}},
        upsert=True,
    )
    return EmotionSnap(
        id=str(r.inserted_id),
        user_id=user_id,
        emotion=doc["emotion"],
        confidence=doc["confidence"],
        source=doc["source"],
        created_at=now,
    )


@router.get("/streak")
async def get_streak(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Consecutive days with at least one emotion snap."""
    cursor = db.emotion_snaps.find({"user_id": user_id}).sort("created_at", -1)
    seen_dates = set()
    async for doc in cursor:
        d = doc["created_at"].date() if hasattr(doc["created_at"], "date") else doc["created_at"]
        if isinstance(d, datetime):
            d = d.date()
        seen_dates.add(str(d))
    # Build streak backwards from today
    today = datetime.utcnow().date()
    streak = 0
    for i in range(365):
        day = today - timedelta(days=i)
        if str(day) in seen_dates:
            streak += 1
        else:
            break
    return {"streak_days": streak}
