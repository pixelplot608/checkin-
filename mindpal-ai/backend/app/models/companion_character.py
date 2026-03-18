"""
AI companion character: name, personality, style. User-created, non-clinical.
"""
from typing import List
from pydantic import BaseModel, Field

PERSONALITY_OPTIONS = ["calm", "caring", "playful", "listener", "funny", "gentle", "quiet", "encouraging"]
STYLE_OPTIONS = ["short and warm", "thoughtful and slow", "light and playful", "minimal and peaceful"]


class CompanionCharacterCreate(BaseModel):
    """User creates their companion."""
    name: str = Field(min_length=1, max_length=50)
    personality_traits: List[str] = Field(max_length=5)  # e.g. ["calm", "listener"]
    conversation_style: str = "short and warm"
    conversation_starter: str | None = None  # optional first message from companion


class CompanionCharacterResponse(BaseModel):
    """Companion for UI."""
    name: str
    personality_traits: List[str]
    conversation_style: str
    conversation_starter: str | None
