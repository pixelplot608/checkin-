"""
Daily snap: one per day (mood, color, photo). Used for Forest trees.
"""
import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_current_user_id
from app.database import get_db
from app.models.daily_snap import DailySnap, DailySnapColor, DailySnapMood

router = APIRouter(prefix="/daily-snaps", tags=["daily-snaps"])

# Directory for snap images (relative to backend root)
UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads" / "snaps"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# URL path prefix for stored images (no leading slash for joining)
UPLOAD_PATH_PREFIX = "snaps"


@router.get("", response_model=list[DailySnap])
async def list_daily_snaps(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """List all daily snaps for the user (for Forest). Oldest first, max 30."""
    cursor = (
        db.daily_snaps.find({"user_id": user_id})
        .sort("date", 1)
        .limit(30)
    )
    out = []
    async for doc in cursor:
        out.append(
            DailySnap(
                id=str(doc["_id"]),
                user_id=doc["user_id"],
                date=doc["date"],
                day_number=doc["day_number"],
                mood=doc["mood"],
                color=doc["color"],
                image_url=doc.get("image_url"),
                timestamp=doc.get("timestamp"),
            )
        )
    return out


async def _get_next_day_number(db, user_id: str, today: str) -> int:
    """Next day number for a new snap today (1-30)."""
    count = await db.daily_snaps.count_documents({"user_id": user_id})
    return min(30, count + 1)


@router.post("", response_model=DailySnap)
async def create_daily_snap(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
    mood: str = Form(...),
    color: str = Form(...),
    image: UploadFile | None = File(None),
):
    """
    Create one daily snap. One per day per user.
    mood: happy | sad | stressed | calm | neutral
    color: yellow | blue | grey | black | green | red
    image: optional photo file
    """
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    # One snap per day
    existing = await db.daily_snaps.find_one({"user_id": user_id, "date": today})
    if existing:
        raise HTTPException(status_code=409, detail="You already have a snap for today.")

    # Validate mood/color
    try:
        mood_enum = DailySnapMood(mood)
        color_enum = DailySnapColor(color)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mood or color.")

    # Day number: count existing snaps + 1, cap 30
    next_num = await _get_next_day_number(db, user_id, today)

    # Save image if provided
    image_url: str | None = None
    if image and image.filename:
        content = await image.read()
        if content and len(content) > 0:
            ext = Path(image.filename or "").suffix or ".jpg"
            if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                ext = ".jpg"
            filename = f"{uuid.uuid4().hex}{ext}"
            path = UPLOADS_DIR / filename
            path.write_bytes(content)
            # URL path for frontend (served under /api/uploads)
            image_url = f"/api/uploads/{UPLOAD_PATH_PREFIX}/{filename}"

    doc = {
        "user_id": user_id,
        "date": today,
        "day_number": next_num,
        "mood": mood_enum.value,
        "color": color_enum.value,
        "image_url": image_url,
        "timestamp": now,
    }
    r = await db.daily_snaps.insert_one(doc)
    return DailySnap(
        id=str(r.inserted_id),
        user_id=doc["user_id"],
        date=doc["date"],
        day_number=doc["day_number"],
        mood=doc["mood"],
        color=doc["color"],
        image_url=doc["image_url"],
        timestamp=doc["timestamp"],
    )
