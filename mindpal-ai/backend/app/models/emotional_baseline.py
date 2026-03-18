"""
Choice-based emotional baseline. Non-clinical, introvert-friendly.
No PHQ-9; simple choices only. Used for 30-day comparison.
"""
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

# Non-clinical, choice-based questions (single choice each)
BASELINE_QUESTIONS = [
    {"id": "usual_mood", "text": "How would you describe your usual mood lately?", "choices": ["Mostly calm", "Generally okay", "Mixed", "Often low", "Very low"]},
    {"id": "energy", "text": "How has your energy been?", "choices": ["Good", "Okay", "Sometimes low", "Often low", "Very low"]},
    {"id": "sleep", "text": "How has sleep been?", "choices": ["Restful", "Okay", "Sometimes difficult", "Often difficult", "Very difficult"]},
    {"id": "connection", "text": "How connected do you feel to people you care about?", "choices": ["Very connected", "Somewhat", "Neutral", "A bit disconnected", "Very disconnected"]},
    {"id": "stress", "text": "How would you rate your stress lately?", "choices": ["Low", "Manageable", "Moderate", "High", "Very high"]},
]


class BaselineChoice(BaseModel):
    """Single question: question_id and choice index (0-based)."""
    question_id: str
    choice_index: int = Field(ge=0, le=4)


class EmotionalBaselineCreate(BaseModel):
    """Submit choice-based baseline. Non-clinical."""
    choices: List[BaselineChoice] = Field(min_length=5, max_length=5)


class EmotionalBaselineSummary(BaseModel):
    """Stored baseline for long-term comparison. Internal only."""
    created_at: datetime
    summary_scores: dict  # e.g. {"usual_mood": 0, "energy": 1, ...} 0=best, 4=worst
    overall_tendency: str  # stable, mixed, low (never shown as diagnosis)
