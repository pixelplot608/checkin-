"""Behavior tracking models."""
from datetime import datetime
from pydantic import BaseModel, Field


class BehaviorCreate(BaseModel):
    sleep_hours: float = Field(default=0, ge=0, le=24)
    screen_time_hours: float = Field(default=0, ge=0, le=24)
    activity_level: int = Field(default=1, ge=1, le=5)  # 1=low, 5=high
    social_interaction: int = Field(default=1, ge=1, le=5)  # 1=low, 5=high
    inactive_minutes: float | None = None  # web-safe idle estimate


# --- Auto tracking (web + system); stored separately, no schema break ---
class BehaviorAutoCreate(BaseModel):
    active_minutes: float = 0
    idle_minutes: float = 0
    session_duration: float = 0
    screen_active: bool = True


class BehaviorSystemCreate(BaseModel):
    system_active_minutes: float = 0
    system_idle_minutes: float = 0
    sleep_detected: bool = False
    timestamp: float = 0


class BehaviorEntry(BaseModel):
    id: str | None = None
    user_id: str
    sleep_hours: float
    screen_time_hours: float
    activity_level: int
    social_interaction: int
    date: str  # YYYY-MM-DD
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class BehaviorProfile(BaseModel):
    """Unified profile: manual entries + hybrid estimates from auto/system."""
    entries: list[BehaviorEntry] = []
    sleep_estimate: float | None = None  # hours
    screen_usage_estimate: float | None = None  # hours
    activity_estimate: int | None = None  # 1-5
    idle_pattern: str | None = None  # e.g. "low", "moderate", "high"
    web_tracking_active: bool = False
    system_tracking_connected: bool = False
    last_auto_sync: datetime | None = None
    last_system_sync: datetime | None = None
