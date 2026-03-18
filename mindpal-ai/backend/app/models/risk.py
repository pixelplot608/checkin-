"""Risk engine models. Internal state never shown to user as diagnosis."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Internal only: used for healing/support. Never display to user.
class InternalEmotionalState(str, Enum):
    STABLE = "stable"
    MILD_CONCERN = "mild_concern"
    NEEDS_SUPPORT = "needs_support"


class RiskScore(BaseModel):
    level: RiskLevel
    score: float  # 0-1, higher = more concern
    factors: list[str] = []
    updated_at: datetime | None = None
    # Internal only; never expose to frontend
    internal_state: InternalEmotionalState | None = None
