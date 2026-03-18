"""
Optional trusted contact for gentle support escalation. User-controlled.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class TrustedContactCreate(BaseModel):
    """Optional: someone to reach out when user wants support."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    relation: Optional[str] = None  # e.g. friend, family
    consent_to_contact: bool = False  # user must opt-in


class TrustedContactResponse(BaseModel):
    """Safe response (no sensitive data)."""
    has_contact: bool
    name: Optional[str] = None
    relation: Optional[str] = None
    consent_to_contact: bool = False
