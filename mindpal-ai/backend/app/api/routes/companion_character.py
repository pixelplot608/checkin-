"""
Companion character: name, personality, style. User-created.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.companion_character import (
    CompanionCharacterCreate,
    CompanionCharacterResponse,
    PERSONALITY_OPTIONS,
    STYLE_OPTIONS,
)

router = APIRouter(prefix="/companion-character", tags=["companion"])


@router.get("/options")
async def get_character_options():
    """Options for creating companion (personality, style)."""
    return {"personality": PERSONALITY_OPTIONS, "style": STYLE_OPTIONS}


@router.post("", response_model=CompanionCharacterResponse)
async def create_or_update_character(
    data: CompanionCharacterCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Create or update companion character. One per user."""
    traits = [t for t in data.personality_traits if t in PERSONALITY_OPTIONS][:5]
    style = data.conversation_style if data.conversation_style in STYLE_OPTIONS else STYLE_OPTIONS[0]
    doc = {
        "user_id": user_id,
        "name": data.name.strip(),
        "personality_traits": traits or ["calm", "listener"],
        "conversation_style": style,
        "conversation_starter": data.conversation_starter.strip() if data.conversation_starter else None,
    }
    await db.companion_characters.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return CompanionCharacterResponse(
        name=doc["name"],
        personality_traits=doc["personality_traits"],
        conversation_style=doc["conversation_style"],
        conversation_starter=doc.get("conversation_starter"),
    )


@router.get("", response_model=CompanionCharacterResponse | None)
async def get_character(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Get current companion character."""
    doc = await db.companion_characters.find_one({"user_id": user_id})
    if not doc:
        return None
    return CompanionCharacterResponse(
        name=doc["name"],
        personality_traits=doc.get("personality_traits", []),
        conversation_style=doc.get("conversation_style", "short and warm"),
        conversation_starter=doc.get("conversation_starter"),
    )
