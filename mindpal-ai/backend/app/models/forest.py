"""
Forest growth: one tree + one animal per daily snap. For 30-day visualization.
Mood color can affect environment; derived from emotion_snaps (no raw user data).
"""
from datetime import date
from pydantic import BaseModel


class TreeDay(BaseModel):
    """One tree per day with snap."""
    day: str  # YYYY-MM-DD
    emotion: str  # for color hint
    mood_color: str | None = None  # hex or name if we have mood


class AnimalDay(BaseModel):
    """One animal per day with snap. Type from emotion."""
    day: str
    animal_type: str  # bird, deer, rabbit, owl, fox, butterfly


class ForestState(BaseModel):
    trees: list[TreeDay]
    animals: list[AnimalDay]
    streak_days: int
    growth: int = 0
    color: str | None = None  # last mood color (hex)
