"""PHQ-9 and baseline schemas."""
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

# PHQ-9 questions: 0-3 each, total 0-27
PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure",
    "Trouble concentrating on things",
    "Moving or speaking slowly, or being fidgety",
    "Thoughts that you would be better off dead or hurting yourself",
]


class PHQ9Answer(BaseModel):
    """Single question answer 0-3."""
    question_index: int = Field(ge=0, le=8)
    value: int = Field(ge=0, le=3)


class PHQ9Create(BaseModel):
    """Full PHQ-9 submission."""
    answers: List[PHQ9Answer] = Field(min_length=9, max_length=9)


class BaselineSummary(BaseModel):
    """Computed baseline from PHQ-9."""
    total_score: int
    created_at: datetime
    severity: str  # minimal, mild, moderate, moderately_severe, severe
