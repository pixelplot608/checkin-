"""
Daily mood snap: one per day, with mood, color, and optional photo.
Stored for Forest visualization (trees by color/size).
"""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class DailySnapMood(str, Enum):
    HAPPY = "happy"
    SAD = "sad"
    STRESSED = "stressed"
    CALM = "calm"
    NEUTRAL = "neutral"


class DailySnapColor(str, Enum):
    YELLOW = "yellow"
    BLUE = "blue"
    GREY = "grey"
    BLACK = "black"
    GREEN = "green"
    RED = "red"


class DailySnapCreate(BaseModel):
    mood: DailySnapMood
    color: DailySnapColor


class DailySnap(BaseModel):
    id: str | None = None
    user_id: str
    date: str  # YYYY-MM-DD
    day_number: int  # 1-30
    mood: str
    color: str
    image_url: str | None = None
    timestamp: datetime | None = None

    class Config:
        from_attributes = True
