"""
Companion chatbot: context-aware, supportive replies.

This module exposes:
- get_reply: lightweight, rule-based fallback (no external APIs).
- get_emotional_gemini_reply: primary path that builds an emotional prompt and
  calls a local Ollama model with Milo's personality when available.
"""

from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pathlib import Path

from app.ai.healing_engine import get_suggestions
from app.ai.sentiment import analyze_sentiment
from app.models.risk import RiskLevel


logger = logging.getLogger(__name__)


# Load backend/.env for consistency with the rest of the app; Ollama itself
# does not require any API keys.
_BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_BACKEND_ENV_PATH, override=False)


RESPONSES = [
    "I hear you. It's okay to feel that way. Want to try a quick breathing exercise?",
    "Thanks for sharing. How about we focus on one small thing you can do right now?",
    "That sounds tough. Remember, small steps count. I'm here.",
    "I get it. Sometimes just naming how we feel helps. You're doing fine by checking in.",
]

GREETINGS = [
    "Hey! How are you feeling today?",
    "Hi there. What's on your mind?",
    "Hello! Ready to check in?",
]


def get_reply(
    user_message: str,
    risk_level: str = "low",
    mood: str | None = None,
    companion_name: str | None = None,
) -> str:
    """
    Generate a supportive, non-clinical reply without any external API calls.

    This is used as a safety and reliability fallback when Gemini is not
    available or fails. It must remain lightweight and privacy-friendly.
    """
    msg_lower = user_message.lower().strip()
    if not msg_lower or msg_lower in ("hi", "hello", "hey"):
        if companion_name:
            return f"Hey! It's {companion_name}. How are you feeling today?"
        return random.choice(GREETINGS)

    if "breath" in msg_lower or "breathe" in msg_lower:
        return (
            "Let's do it together: breathe in for 4 counts, hold for 2, out for 6. "
            "Repeat 3 times. How does that feel?"
        )
    if "sad" in msg_lower or "down" in msg_lower or "bad" in msg_lower:
        return (
            "I'm sorry you're feeling that way. It's okay to have off days. "
            "Want a small task idea or just to sit with it for a bit?"
        )
    if "stress" in msg_lower or "anxious" in msg_lower:
        return (
            "Stress is real. Try this: name 3 things you can see, 2 you can hear, "
            "1 you can touch. It can help ground you."
        )

    level = RiskLevel(risk_level) if risk_level in ("low", "medium", "high") else RiskLevel.LOW
    suggestions = get_suggestions(level, 1)
    return random.choice(RESPONSES) + " " + (suggestions[0] if suggestions else "")


async def _summarize_recent_mood(db, user_id: str) -> Optional[str]:
    """Create a short, privacy-friendly description of recent mood patterns."""
    cursor = db.mood_entries.find({"user_id": user_id}).sort("created_at", -1).limit(7)
    moods: List[str] = []
    async for doc in cursor:
        moods.append(doc.get("mood", ""))
    if not moods:
        return None
    counts: Dict[str, int] = {}
    for m in moods:
        if not m:
            continue
        counts[m] = counts.get(m, 0) + 1
    if not counts:
        return None
    dominant = max(counts.items(), key=lambda x: x[1])[0]
    return f"recent moods mostly '{dominant}' over the last few check-ins"


async def _summarize_recent_behavior(db, user_id: str) -> Optional[str]:
    """Create a short description of the latest behavior snapshot (sleep/activity)."""
    cursor = db.behavior_entries.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    if not docs:
        return None
    b = docs[0]
    sleep = b.get("sleep_hours")
    activity = b.get("activity_level")
    parts: List[str] = []
    if isinstance(sleep, (int, float)):
        if sleep < 6:
            parts.append("sleep has been on the lower side")
        elif sleep >= 8:
            parts.append("sleep has been on the higher side")
    if isinstance(activity, (int, float)):
        if activity <= 2:
            parts.append("activity has been fairly low")
        elif activity >= 4:
            parts.append("activity has been relatively high")
    if not parts:
        return None
    return "; ".join(parts)


async def _fetch_last_journal_state(db, user_id: str) -> Optional[Dict[str, str]]:
    """
    Fetch the last journal-derived emotional state stored alongside risk.

    This does not change the RiskScore schema; it simply reads extra fields
    that were attached to the same document.
    """
    doc = await db.risk_scores.find_one({"user_id": user_id})
    if not doc:
        return None
    emotion = doc.get("last_journal_emotion")
    stress = doc.get("last_journal_stress")
    fatigue = doc.get("last_journal_fatigue")
    risk = doc.get("last_journal_risk")
    if not any([emotion, stress, fatigue, risk]):
        return None
    return {
        "emotion": emotion or "unknown",
        "stress": stress or "unknown",
        "fatigue": fatigue or "unknown",
        "risk": risk or "unknown",
    }


def generate_companion_reply(prompt: str) -> str:
    """
    Call a local Ollama model (llama3) with the given prompt and return Milo's reply.

    If Ollama is not available or the call fails, return a gentle
    fallback line. This helper never raises.
    """
    try:
        import requests  # local import to avoid hard dependency if unused

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False,
            },
            timeout=60,
        )
        if response.status_code == 200:
            data = response.json()
            text = (data.get("response") or "").strip()
            if text:
                return text
        # Fallback ONLY if Ollama returns no text
        return "Hmm… I’m still here with you 🐾"
    except Exception as exc:
        logger.warning("Milo: Ollama error, using fallback reply. Error: %s", exc)
        return "I'm here with you."


SYSTEM_PROMPT = """
You are Milo, a cute, warm, playful cat-like emotional AI companion.

You speak like a caring friend, not an assistant.
You are gentle, kind, playful, and emotionally supportive.
Never clinical. Never robotic. Never diagnose.
Short to medium comforting replies.

If user is sad → comfort
If stressed → suggest calm breathing or rest
If happy → celebrate softly
If lonely → reassure presence
"""


def _build_milo_prompt(
    user_message: str,
    sentiment: str,
    mood: str,
    behavior: str,
    risk: str,
    journal_state: Optional[Dict[str, str]] = None,
) -> str:
    """
    Build the full Milo system + context prompt as specified in the task.
    """
    base = (
        f"{SYSTEM_PROMPT}\n\n"
        f"User message: {user_message}\n"
        f"Sentiment: {sentiment}\n"
        f"Mood trend: {mood}\n"
        f"Behavior signals: {behavior}\n"
        f"Risk level: {risk}\n"
    )
    if journal_state:
        base += (
            "\nUser recent emotional state:\n"
            f"Emotion: {journal_state.get('emotion', 'unknown')}\n"
            f"Stress: {journal_state.get('stress', 'unknown')}\n"
            f"Fatigue: {journal_state.get('fatigue', 'unknown')}\n"
            f"Risk: {journal_state.get('risk', 'unknown')}\n\n"
            "Adjust your tone accordingly. If the user seems sad, be softer and comforting. "
            "If anxious, be calming and grounding. If tired, keep your tone soothing and low-energy. "
            "If overwhelmed, simplify suggestions. If calm, respond in your normal friendly tone. "
            "If positive, you can be slightly more cheerful and playful like a cat.\n"
        )
    return base


async def get_emotional_context_and_personality(
    user_message: str,
    *,
    db,
    user_id: str,
    risk_level: str,
    internal_state: Optional[str] = None,
    companion_name: Optional[str] = None,
) -> tuple[str, str]:
    """
    Build emotional context and personality strings for Sarvam (or other reply generators).
    Same data as get_emotional_gemini_reply; no reply is generated here.
    """
    sentiment_dict = analyze_sentiment(user_message)
    sentiment_desc = (
        f"{sentiment_dict.get('emotion_label')} (score {sentiment_dict.get('sentiment_score')})"
        if sentiment_dict
        else "unknown"
    )
    mood_summary = await _summarize_recent_mood(db, user_id)
    behavior_summary = await _summarize_recent_behavior(db, user_id)
    journal_state = await _fetch_last_journal_state(db, user_id)
    mood_desc = mood_summary or "not enough recent mood check-ins"
    behavior_desc = behavior_summary or "no recent behavior data"
    risk_desc = risk_level or "unknown"

    parts = [
        f"Sentiment: {sentiment_desc}",
        f"Mood trend: {mood_desc}",
        f"Behavior signals: {behavior_desc}",
        f"Risk level: {risk_desc}",
    ]
    if journal_state:
        parts.append(
            f"Recent emotional state: emotion={journal_state.get('emotion', 'unknown')}, "
            f"stress={journal_state.get('stress', 'unknown')}, "
            f"fatigue={journal_state.get('fatigue', 'unknown')}, "
            f"risk={journal_state.get('risk', 'unknown')}."
        )
    if internal_state:
        parts.append(f"Internal state: {internal_state}.")
    emotional_context = "\n".join(parts)

    personality = "Gentle, warm, supportive, non-clinical, validating."
    if companion_name:
        personality = f"Companion name: {companion_name}. " + personality
    return emotional_context, personality


async def get_emotional_gemini_reply(
    user_message: str,
    *,
    db,
    user_id: str,
    risk_level: str,
    internal_state: Optional[str] = None,
    companion_name: Optional[str] = None,
) -> str:
    """
    Primary path for generating a reply using Gemini 1.5 Flash.

    - Builds Milo's emotional prompt using:
      - current user message sentiment
      - recent mood and behavior summaries
      - risk level (internal context only)
    - Falls back to a gentle text only if Gemini fails.
    """
    try:
        # Lightweight sentiment on the current message (no raw text is stored).
        sentiment_dict = analyze_sentiment(user_message)
        sentiment_desc = (
            f"{sentiment_dict.get('emotion_label')} (score {sentiment_dict.get('sentiment_score')})"
            if sentiment_dict
            else "unknown"
        )

        mood_summary = await _summarize_recent_mood(db, user_id)
        behavior_summary = await _summarize_recent_behavior(db, user_id)
        journal_state = await _fetch_last_journal_state(db, user_id)

        mood_desc = mood_summary or "not enough recent mood check-ins"
        behavior_desc = behavior_summary or "no recent behavior data"
        risk_desc = risk_level or "unknown"

        prompt = _build_milo_prompt(
            user_message=user_message,
            sentiment=sentiment_desc,
            mood=mood_desc,
            behavior=behavior_desc,
            risk=risk_desc,
            journal_state=journal_state,
        )

        reply = generate_companion_reply(prompt)
        cleaned = reply.strip()
        # As an extra guard, trim extremely long replies.
        if len(cleaned) > 800:
            cleaned = cleaned[:800]
        return cleaned or "I'm here with you."
    except Exception:
        # Any error: stay quiet and fall back to a gentle line.
        return "I'm here with you."
