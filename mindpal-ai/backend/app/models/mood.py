"""Mood tracker models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class MoodType(str, Enum):
    HAPPY = "happy"
    NEUTRAL = "neutral"
    SAD = "sad"
    STRESSED = "stressed"


class MoodCreate(BaseModel):
    mood: MoodType
    note: str | None = None
    mood_color: str | None = None  # optional hex e.g. #7cb342 for UI theme


class MoodEntry(BaseModel):
    id: str | None = None
    user_id: str
    mood: str
    note: str | None = None
    mood_color: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
