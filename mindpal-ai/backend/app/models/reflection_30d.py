"""
30-day reflection: choice-based questionnaire. Non-clinical.
Compare with initial emotional baseline for gentle insight (no diagnosis).
"""
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

# Same structure as baseline: reflective "how are you now" questions
REFLECTION_QUESTIONS = [
    {"id": "usual_mood", "text": "How would you describe your usual mood lately?", "choices": ["Mostly calm", "Generally okay", "Mixed", "Often low", "Very low"]},
    {"id": "energy", "text": "How has your energy been?", "choices": ["Good", "Okay", "Sometimes low", "Often low", "Very low"]},
    {"id": "sleep", "text": "How has sleep been?", "choices": ["Restful", "Okay", "Sometimes difficult", "Often difficult", "Very difficult"]},
    {"id": "connection", "text": "How connected do you feel to people you care about?", "choices": ["Very connected", "Somewhat", "Neutral", "A bit disconnected", "Very disconnected"]},
    {"id": "stress", "text": "How would you rate your stress lately?", "choices": ["Low", "Manageable", "Moderate", "High", "Very high"]},
]


class ReflectionChoice(BaseModel):
    question_id: str
    choice_index: int = Field(ge=0, le=4)


class ReflectionSubmit(BaseModel):
    choices: List[ReflectionChoice] = Field(min_length=5, max_length=5)


class ReflectionSummary(BaseModel):
    created_at: datetime
    summary_scores: dict  # question_id -> choice_index (0=best, 4=worst)
    overall_tendency: str  # stable, mixed, low (internal only)


class ReflectionCompare(BaseModel):
    """Gentle comparison: baseline vs now. Never diagnostic."""
    baseline_tendency: str
    reflection_tendency: str
    baseline_at: datetime | None
    reflection_at: datetime | None
    message: str  # Calm, non-alarming summary
