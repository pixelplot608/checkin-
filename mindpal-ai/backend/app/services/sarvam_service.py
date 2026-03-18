"""
Sarvam AI integration for MindPal Companion.
Used only as the language + response generator layer; replies mirror the user's language.
"""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SARVAM_API_BASE = "https://api.sarvam.ai/v1"
SARVAM_MODEL = "sarvam-m"


async def generate_sarvam_reply(
    user_text: str,
    emotional_context: str,
    personality: str,
) -> str:
    """
    Call Sarvam chat completion to generate a reply in the same language as the user.
    Uses SARVAM_API_KEY from environment. Raises on API failure (caller should fallback).
    """
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise ValueError("SARVAM_API_KEY is not set")

    system_content = (
        "You are MindPal Companion, a gentle emotional AI friend.\n\n"
        "Detect the user's language automatically and respond in the same language.\n\n"
        "Rules:\n"
        "- If the user writes in English → respond in English\n"
        "- If the user writes in Tamil → respond in Tamil\n"
        "- If the user writes in Tanglish (Tamil using English letters) → respond in Tamil\n"
        "- Mirror the user's language naturally\n\n"
        "Maintain:\n"
        "- Gentle emotional tone\n"
        "- Warm, supportive, calm personality\n"
        "- Non-clinical emotional support\n"
        "- No diagnosis\n"
        "- No medical advice\n"
        "- Validate emotions first\n"
        "- Encourage softly\n"
        "- Keep responses human and simple\n\n"
        "Emotional context (use this to tailor your tone; do not repeat it):\n"
        f"{emotional_context}\n\n"
        "Personality / companion traits:\n"
        f"{personality}"
    )

    user_content = (
        f"User message:\n{user_text}\n\n"
        "Respond in the same language as the user, briefly and supportively."
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]

    payload: dict[str, Any] = {
        "model": SARVAM_MODEL,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 512,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_API_BASE}/chat/completions",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "api-subscription-key": api_key,
            },
        )

    if response.status_code != 200:
        logger.warning("Sarvam API error: status=%s body=%s", response.status_code, response.text[:200])
        raise RuntimeError(f"Sarvam API returned {response.status_code}")

    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Sarvam API returned no choices")

    message = choices[0].get("message") or {}
    text = (message.get("content") or "").strip()
    if not text:
        raise RuntimeError("Sarvam API returned empty content")

    return text
