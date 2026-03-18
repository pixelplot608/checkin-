"""Journal / text sentiment models."""
from datetime import datetime
from pydantic import BaseModel


class JournalCreate(BaseModel):
    """Text required for sentiment; if store_emotion_only=True we do not persist text."""
    text: str
    store_emotion_only: bool = False  # When True: analyze sentiment but store only score + emotion_label


class JournalEntry(BaseModel):
    id: str | None = None
    user_id: str
    text: str | None = None  # None when entry was stored as emotion-only (privacy)
    sentiment_score: float  # -1 to 1 or 0-1
    emotion_label: str | None = None
    stress_level: str | None = None  # "low" | "medium" | "high"
    risk_level: str | None = None
    ai_insight: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
