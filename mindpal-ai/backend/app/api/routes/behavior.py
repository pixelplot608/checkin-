"""
Behavior tracking routes. Manual + auto (web) + system; hybrid profile.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.behavior import (
    BehaviorCreate,
    BehaviorEntry,
    BehaviorAutoCreate,
    BehaviorSystemCreate,
    BehaviorProfile,
)

router = APIRouter(prefix="/behavior", tags=["behavior"])


@router.post("", response_model=BehaviorEntry)
async def create_behavior(
    data: BehaviorCreate,
    date: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    from datetime import date as date_type
    d = date or datetime.utcnow().strftime("%Y-%m-%d")
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "sleep_hours": data.sleep_hours,
        "screen_time_hours": data.screen_time_hours,
        "activity_level": data.activity_level,
        "social_interaction": data.social_interaction,
        "date": d,
        "created_at": now,
    }
    if data.inactive_minutes is not None:
        doc["inactive_minutes"] = data.inactive_minutes
    r = await db.behavior_entries.insert_one(doc)
    return BehaviorEntry(
        id=str(r.inserted_id),
        user_id=user_id,
        sleep_hours=doc["sleep_hours"],
        screen_time_hours=doc["screen_time_hours"],
        activity_level=doc["activity_level"],
        social_interaction=doc["social_interaction"],
        date=doc["date"],
        created_at=now,
    )


@router.get("", response_model=list[BehaviorEntry])
async def list_behavior(
    limit: int = 30,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    out = []
    async for doc in db.behavior_entries.find({"user_id": user_id}).sort("created_at", -1).limit(limit):
        out.append(BehaviorEntry(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            sleep_hours=doc["sleep_hours"],
            screen_time_hours=doc["screen_time_hours"],
            activity_level=doc["activity_level"],
            social_interaction=doc["social_interaction"],
            date=doc["date"],
            created_at=doc.get("created_at"),
        ))
    return out


# --- Auto (web) tracking: store separately ---
@router.post("/auto")
async def create_behavior_auto(
    data: BehaviorAutoCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "active_minutes": data.active_minutes,
        "idle_minutes": data.idle_minutes,
        "session_duration": data.session_duration,
        "screen_active": data.screen_active,
        "created_at": now,
    }
    await db.behavior_auto.insert_one(doc)
    return {"ok": True}


# --- System tracking: store separately ---
@router.post("/system")
async def create_behavior_system(
    data: BehaviorSystemCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "system_active_minutes": data.system_active_minutes,
        "system_idle_minutes": data.system_idle_minutes,
        "sleep_detected": data.sleep_detected,
        "timestamp": data.timestamp,
        "created_at": now,
    }
    await db.behavior_system.insert_one(doc)
    return {"ok": True}


# --- Hybrid profile: manual + auto + system → estimates ---
@router.get("/profile", response_model=BehaviorProfile)
async def get_behavior_profile(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    # Manual entries (unchanged)
    entries = []
    async for doc in db.behavior_entries.find({"user_id": user_id}).sort("created_at", -1).limit(30):
        entries.append(BehaviorEntry(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            sleep_hours=doc["sleep_hours"],
            screen_time_hours=doc["screen_time_hours"],
            activity_level=doc["activity_level"],
            social_interaction=doc["social_interaction"],
            date=doc["date"],
            created_at=doc.get("created_at"),
        ))

    # Last 24h auto (web)
    since = datetime.utcnow() - timedelta(hours=24)
    auto_docs: list[dict] = []
    async for d in db.behavior_auto.find({"user_id": user_id, "created_at": {"$gte": since}}).sort("created_at", -1).limit(500):
        auto_docs.append(d)
    last_auto = auto_docs[0].get("created_at") if auto_docs else None

    # Last 24h system
    system_docs: list[dict] = []
    async for d in db.behavior_system.find({"user_id": user_id, "created_at": {"$gte": since}}).sort("created_at", -1).limit(500):
        system_docs.append(d)
    last_system = system_docs[0].get("created_at") if system_docs else None

    # Hybrid estimates (no risk logic change)
    sleep_estimate: float | None = None
    screen_usage_estimate: float | None = None
    activity_estimate: int | None = None
    idle_pattern: str | None = None

    total_auto_active = float(sum(d.get("active_minutes", 0) or 0 for d in auto_docs))
    total_auto_idle = float(sum(d.get("idle_minutes", 0) or 0 for d in auto_docs))
    total_system_active = float(sum(d.get("system_active_minutes", 0) or 0 for d in system_docs))
    total_system_idle = float(sum(d.get("system_idle_minutes", 0) or 0 for d in system_docs))

    # Screen usage: from active time, clamped [0, 16] hours. Require meaningful data.
    total_active_min = total_auto_active + total_system_active
    if total_active_min >= 30:  # at least 30 minutes of tracked activity in last 24h
        screen_hours = total_active_min / 60.0
        screen_hours = max(0.0, min(16.0, screen_hours))
        screen_usage_estimate = round(screen_hours * 10) / 10

    # Sleep estimate: look for the longest gap between system tracker samples, treat as sleep.
    # If no valid long gap (e.g. >= 3h) -> leave as None (not enough data).
    if len(system_docs) >= 2:
        # Sort by timestamp if present, else created_at
        ordered = sorted(
            system_docs,
            key=lambda d: d.get("timestamp") or (d.get("created_at") or datetime.utcnow()).timestamp(),
        )
        max_gap_hours = 0.0
        for prev, cur in zip(ordered, ordered[1:]):
            t_prev = prev.get("timestamp") or (prev.get("created_at") or datetime.utcnow()).timestamp()
            t_cur = cur.get("timestamp") or (cur.get("created_at") or datetime.utcnow()).timestamp()
            gap_hours = max(0.0, (t_cur - t_prev) / 3600.0)
            if gap_hours > max_gap_hours:
                max_gap_hours = gap_hours
        if max_gap_hours >= 3.0:  # consider long, continuous gap as possible sleep
            clamped = max(0.0, min(12.0, max_gap_hours))
            sleep_estimate = round(clamped * 10) / 10

    # Activity level: map active hours to 1–5, only if enough data.
    if total_active_min >= 60:  # at least 1h of activity in last 24h
        active_hours = total_active_min / 60.0
        if active_hours > 6.0:
            activity_estimate = 5 if active_hours > 9.0 else 4
        elif 3.0 <= active_hours <= 6.0:
            activity_estimate = 3
        else:  # < 3h
            activity_estimate = 2 if active_hours >= 1.5 else 1

    # Idle pattern: only when both web+system report idle; otherwise, insufficient data.
    combined_idle_min = min(total_auto_idle, total_system_idle) if (total_auto_idle and total_system_idle) else 0.0
    if combined_idle_min > 0:
        if combined_idle_min > 120:  # >2h idle in last 24h
            idle_pattern = "high"
        elif combined_idle_min > 30:
            idle_pattern = "moderate"
        else:
            idle_pattern = "low"

    return BehaviorProfile(
        entries=entries,
        sleep_estimate=sleep_estimate,
        screen_usage_estimate=screen_usage_estimate,
        activity_estimate=activity_estimate,
        idle_pattern=idle_pattern,
        web_tracking_active=len(auto_docs) > 0,
        system_tracking_connected=len(system_docs) > 0,
        last_auto_sync=last_auto,
        last_system_sync=last_system,
    )
