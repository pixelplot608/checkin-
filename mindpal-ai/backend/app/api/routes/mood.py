"""
Mood tracker routes.
"""
import tempfile
import os
from datetime import datetime
from typing import Tuple
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.mood import MoodCreate, MoodEntry

router = APIRouter(prefix="/mood", tags=["mood"])

# Emotion from DeepFace -> API response (happy, sad, neutral, fear, angry, surprise)
ALLOWED_EMOTIONS = {"happy", "sad", "neutral", "fear", "angry", "surprise", "disgust"}


def _choose_emotion_from_probabilities(emotions: dict) -> Tuple[str, float]:
    """
    Choose emotion from probability dict. Highest probability wins.
    Reduce neutral bias: prefer sad/fear/angry when neutral is top but negative > 20;
    sad > 25 forces sad; happy > 30 forces happy; all < 15 -> neutral.
    Returns (emotion, confidence as 0-1 float).
    """
    if not emotions or not isinstance(emotions, dict):
        return "neutral", 0.0
    probs = {k: float(v) for k, v in emotions.items() if isinstance(v, (int, float))}
    if not probs:
        return "neutral", 0.0
    # Normalize to 0-100 if needed (DeepFace often returns 0-100)
    total = sum(probs.values())
    if total > 1.5:  # assume 0-100 scale
        probs = {k: v / 100.0 for k, v in probs.items()}
    else:
        probs = {k: v for k, v in probs.items()}
    # Choose by highest probability (not dominant_emotion)
    emotion = max(probs, key=probs.get)
    confidence = probs.get(emotion, 0.0)

    sad = probs.get("sad", 0)
    happy = probs.get("happy", 0)
    neutral_p = probs.get("neutral", 0)
    fear = probs.get("fear", 0)
    angry = probs.get("angry", 0)

    # If all probabilities very low (< 15% in 0-1 scale = 0.15) -> neutral
    if all(p < 0.15 for p in probs.values()):
        return "neutral", float(neutral_p)

    # If sad probability > 25% -> force sad
    if sad > 0.25:
        return "sad", float(sad)
    # If happy probability > 30% -> happy
    if happy > 0.30:
        return "happy", float(happy)

    # Reduce neutral bias: if detected is neutral AND any of sad/fear/angry > 20% -> pick highest among them
    if emotion == "neutral" and (sad > 0.20 or fear > 0.20 or angry > 0.20):
        neg = {"sad": sad, "fear": fear, "angry": angry}
        best_neg = max(neg, key=neg.get)
        if neg[best_neg] > 0.20:
            return best_neg, float(neg[best_neg])

    return emotion, confidence


@router.post("", response_model=MoodEntry)
async def create_mood(data: MoodCreate, user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "mood": data.mood.value,
        "note": data.note,
        "mood_color": getattr(data, "mood_color", None),
        "created_at": now,
    }
    r = await db.mood_entries.insert_one(doc)
    doc["_id"] = r.inserted_id
    return MoodEntry(
        id=str(r.inserted_id),
        user_id=user_id,
        mood=doc["mood"],
        note=doc["note"],
        mood_color=doc.get("mood_color"),
        created_at=now,
    )


@router.get("", response_model=list[MoodEntry])
async def list_mood(
    limit: int = 100,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    cursor = db.mood_entries.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    out = []
    async for doc in cursor:
        out.append(MoodEntry(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            mood=doc["mood"],
            note=doc.get("note"),
            mood_color=doc.get("mood_color"),
            created_at=doc.get("created_at"),
        ))
    return out


@router.post("/analyze")
async def analyze_mood_image(
    image: UploadFile = File(..., alias="image"),
    user_id: str = Depends(get_current_user_id),
):
    """Analyze emotion from uploaded image. No storage. Returns { emotion, confidence } or { error: no_face }."""
    tmp_path = None
    try:
        suffix = ".jpg"
        if image.content_type and "png" in image.content_type:
            suffix = ".png"
        elif image.content_type and "webp" in image.content_type:
            suffix = ".webp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await image.read()
            tmp.write(content)
        from deepface import DeepFace

        result = DeepFace.analyze(
            img_path=tmp_path,
            actions=["emotion"],
            enforce_detection=False,
        )
        if not result:
            return JSONResponse(status_code=200, content={"error": "no_face"})
        if not isinstance(result, list):
            result = [result]
        if len(result) == 0:
            return JSONResponse(status_code=200, content={"error": "no_face"})
        emotions = result[0].get("emotion")
        if not emotions:
            return JSONResponse(status_code=200, content={"error": "no_face"})
        emotion = max(emotions, key=emotions.get)
        confidence = emotions[emotion]
        return {"emotion": emotion, "confidence": float(confidence)}
    except Exception:
        return JSONResponse(status_code=200, content={"error": "no_face"})
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
