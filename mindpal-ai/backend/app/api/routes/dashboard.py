"""
Dashboard aggregate data.
Returns risk score, mood summary, streak, last PHQ9, behavior stats.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.ai.risk_engine import compute_risk

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    risk = await compute_risk(db, user_id)

    # Mood entries last 14 days (for graph)
    week_ago = datetime.utcnow() - timedelta(days=14)
    mood_entries = []
    async for m in db.mood_entries.find({"user_id": user_id, "created_at": {"$gte": week_ago}}).sort("created_at", 1):
        mood_entries.append({
            "date": m["created_at"].isoformat() if m.get("created_at") else None,
            "mood": m["mood"],
        })

    # Emotion trend (last 14 days)
    emotion_snaps = []
    async for e in db.emotion_snaps.find({"user_id": user_id, "created_at": {"$gte": week_ago}}).sort("created_at", 1):
        emotion_snaps.append({
            "date": e["created_at"].isoformat() if e.get("created_at") else None,
            "emotion": e["emotion"],
            "confidence": e.get("confidence", 1),
        })

    # Streak
    cursor = db.emotion_snaps.find({"user_id": user_id}).sort("created_at", -1)
    seen_dates = set()
    async for doc in cursor:
        d = doc.get("created_at")
        if d is None:
            continue
        if hasattr(d, "date"):
            d = d.date()
        seen_dates.add(str(d))
    today = datetime.utcnow().date()
    streak = 0
    for i in range(365):
        day = today - timedelta(days=i)
        if str(day) in seen_dates:
            streak += 1
        else:
            break

    # Activity summary counts
    mood_count = await db.mood_entries.count_documents({"user_id": user_id})
    journal_count = await db.journal_entries.count_documents({"user_id": user_id})
    snap_count = await db.emotion_snaps.count_documents({"user_id": user_id})

    # Last PHQ9 (safe when empty)
    phq_cursor = db.phq9.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    phq_docs = await phq_cursor.to_list(length=1)
    last_phq9 = None
    if phq_docs:
        d = phq_docs[0]
        last_phq9 = {"total_score": d["total_score"], "severity": d["severity"], "created_at": d.get("created_at")}

    # Behavior stats (last entry)
    behavior_cursor = db.behavior_entries.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    behavior_docs = await behavior_cursor.to_list(length=1)
    behavior_stats = None
    if behavior_docs:
        b = behavior_docs[0]
        behavior_stats = {
            "sleep_hours": b.get("sleep_hours"),
            "screen_time_hours": b.get("screen_time_hours"),
            "activity_level": b.get("activity_level"),
            "social_interaction": b.get("social_interaction"),
        }

    return {
        "risk": {
            "level": risk.level.value,
            "score": risk.score,
            "factors": risk.factors or [],
        },
        "mood_summary": mood_entries,
        "mood_graph": mood_entries,
        "emotion_trend": emotion_snaps,
        "streak_days": streak,
        "last_phq9": last_phq9,
        "behavior_stats": behavior_stats,
        "activity": {
            "mood_logs": mood_count,
            "journal_entries": journal_count,
            "emotion_snaps": snap_count,
        },
    }
