"""
Forest activities: calm, non-competitive. No scores, no failure.
Types: calm_animal, water_plant, simple_puzzle.
"""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class ForestActivityType(str, Enum):
    CALM_ANIMAL = "calm_animal"
    WATER_PLANT = "water_plant"
    SIMPLE_PUZZLE = "simple_puzzle"


class ForestActivityCreate(BaseModel):
    activity_type: ForestActivityType


class ForestActivityRecord(BaseModel):
    id: str | None = None
    user_id: str
    activity_type: str
    created_at: datetime | None = None
