"""
Forest growth: one tree + one animal per day with emotion snap. Calm, non-competitive.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.forest import ForestState, TreeDay, AnimalDay
from app.models.forest_activity import ForestActivityCreate, ForestActivityRecord

# Emotion -> animal (calm, friendly)
EMOTION_ANIMAL = {
    "happy": "butterfly",
    "sad": "deer",
    "stressed": "owl",
    "tired": "rabbit",
    "neutral": "bird",
    "angry": "fox",
}
# Emotion -> mood color hint for tree
EMOTION_COLOR = {
    "happy": "#7cb342",
    "sad": "#5c6bc0",
    "stressed": "#ff8f00",
    "tired": "#78909c",
    "neutral": "#66bb6a",
    "angry": "#e57373",
}

router = APIRouter(prefix="/forest", tags=["forest"])


@router.get("", response_model=ForestState)
async def get_forest(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Forest state: one tree + one animal per day with at least one emotion snap.
    Last 30 days. Streak = consecutive days with a snap.
    """
    cursor = db.emotion_snaps.find({"user_id": user_id}).sort("created_at", -1)
    by_date: dict[str, str] = {}  # date -> emotion (use first snap of day)
    async for doc in cursor:
        d = doc.get("created_at")
        if d:
            day = d.date() if hasattr(d, "date") else d
            if isinstance(day, datetime):
                day = day.date()
            key = str(day)
            if key not in by_date:
                by_date[key] = doc.get("emotion", "neutral")
    # Limit to 30 days, sorted newest first
    sorted_dates = sorted(by_date.keys(), reverse=True)[:30]
    trees = [
        TreeDay(
            day=day,
            emotion=by_date[day],
            mood_color=EMOTION_COLOR.get(by_date[day]),
        )
        for day in sorted_dates
    ]
    animals = [
        AnimalDay(
            day=day,
            animal_type=EMOTION_ANIMAL.get(by_date[day], "bird"),
        )
        for day in sorted_dates
    ]
    # Streak
    today = datetime.utcnow().date()
    streak = 0
    for i in range(365):
        day = today - timedelta(days=i)
        if str(day) in by_date:
            streak += 1
        else:
            break
    # Growth + last color from forest_state (updated on each mood snap)
    forest_doc = await db.forest_state.find_one({"user_id": user_id})
    growth = int(forest_doc.get("growth", 0)) if forest_doc else 0
    color = forest_doc.get("last_color") if forest_doc else None
    return ForestState(trees=trees, animals=animals, streak_days=streak, growth=growth, color=color)


# --- Forest activities: calm, no failure ---

@router.post("/activity", response_model=ForestActivityRecord)
async def record_forest_activity(
    data: ForestActivityCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Record a calm activity (calm animal, water plant, puzzle). No score, no failure."""
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "activity_type": data.activity_type.value,
        "created_at": now,
    }
    r = await db.forest_activities.insert_one(doc)
    return ForestActivityRecord(
        id=str(r.inserted_id),
        user_id=user_id,
        activity_type=doc["activity_type"],
        created_at=now,
    )


@router.get("/activities", response_model=list[ForestActivityRecord])
async def list_forest_activities(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Recent forest activities. For gentle engagement only."""
    out = []
    async for doc in db.forest_activities.find({"user_id": user_id}).sort("created_at", -1).limit(limit):
        out.append(ForestActivityRecord(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            activity_type=doc["activity_type"],
            created_at=doc.get("created_at"),
        ))
    return out
