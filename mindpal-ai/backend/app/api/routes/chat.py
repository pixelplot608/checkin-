"""
Companion chat routes.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id
from app.models.chat import ChatMessageCreate, ChatMessage
from app.services.chat_service import get_emotional_context_and_personality, get_emotional_gemini_reply
from app.services.sarvam_service import generate_sarvam_reply
from app.ai.risk_engine import compute_risk

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatMessage)
async def send_message(
    data: ChatMessageCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    # Store user message
    await db.chat_messages.insert_one(
        {
            "user_id": user_id,
            "role": "user",
            "content": data.content,
            "created_at": now,
        }
    )
    # Get risk for context (includes internal_state but never sent to frontend)
    risk = await compute_risk(db, user_id)
    companion = await db.companion_characters.find_one({"user_id": user_id})
    companion_name = companion.get("name") if companion else None

    emotional_context, personality = await get_emotional_context_and_personality(
        data.content,
        db=db,
        user_id=user_id,
        risk_level=risk.level.value,
        internal_state=risk.internal_state.value if getattr(risk, "internal_state", None) else None,
        companion_name=companion_name,
    )
    try:
        reply = await generate_sarvam_reply(
            user_text=data.content,
            emotional_context=emotional_context,
            personality=personality,
        )
    except Exception:
        reply = await get_emotional_gemini_reply(
            data.content,
            db=db,
            user_id=user_id,
            risk_level=risk.level.value,
            internal_state=risk.internal_state.value if getattr(risk, "internal_state", None) else None,
            companion_name=companion_name,
        )

    # Store assistant reply
    r = await db.chat_messages.insert_one(
        {
            "user_id": user_id,
            "role": "assistant",
            "content": reply,
            "created_at": now,
        }
    )
    return ChatMessage(
        id=str(r.inserted_id),
        user_id=user_id,
        role="assistant",
        content=reply,
        created_at=now,
    )


@router.get("/history", response_model=list[ChatMessage])
async def get_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    out = []
    async for doc in db.chat_messages.find({"user_id": user_id}).sort("created_at", -1).limit(limit):
        out.append(ChatMessage(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            role=doc["role"],
            content=doc["content"],
            created_at=doc.get("created_at"),
        ))
    return list(reversed(out))
