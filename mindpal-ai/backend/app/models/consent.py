"""
Privacy & consent models. No medical language.
"""
from datetime import datetime
from pydantic import BaseModel


class ConsentAccept(BaseModel):
    """User accepts privacy & data usage (non-medical)."""
    accepted: bool = True
    consent_version: str = "1.0"


class ConsentStatus(BaseModel):
    """Current consent status for UI."""
    accepted: bool
    accepted_at: datetime | None
    consent_version: str | None
