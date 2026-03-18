"""Chat / companion models."""
from datetime import datetime
from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    content: str
    role: str = "user"  # user | assistant


class ChatMessage(BaseModel):
    id: str | None = None
    user_id: str
    role: str
    content: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True
