"""Face emotion snap models."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class EmotionType(str, Enum):
    HAPPY = "happy"
    SAD = "sad"
    STRESSED = "stressed"
    TIRED = "tired"
    NEUTRAL = "neutral"
    ANGRY = "angry"


class EmotionSnapCreate(BaseModel):
    emotion: EmotionType
    confidence: float = 1.0  # 0-1
    color: str | None = None  # optional mood color hex for forest


class EmotionSnap(BaseModel):
    id: str | None = None
    user_id: str
    emotion: str
    confidence: float
    source: str = "snap"  # snap | live
    created_at: datetime | None = None

    class Config:
        from_attributes = True
