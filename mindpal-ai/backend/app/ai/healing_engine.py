"""
Healing & support: suggestions from internal emotional state.
Breathing, mindfulness, small tasks, calm music. Non-clinical tone.
Ethical escalation: only when high concern + user consent; gentle wording.
"""
import random
from app.models.risk import RiskLevel, InternalEmotionalState

# By internal state (used for healing; never shown as label to user)
SUGGESTIONS = {
    InternalEmotionalState.STABLE: [
        "Keep up the great work. A short walk or a few deep breaths can keep the good vibes going.",
        "You're doing well. Maybe try a quick mindfulness moment or a small task you enjoy.",
        "A little calm music or nature sounds can help you unwind.",
    ],
    InternalEmotionalState.MILD_CONCERN: [
        "It's okay to have tougher days. Try 2 minutes of slow breathing — in for 4, out for 6.",
        "How about a small win? One tiny task (e.g. make your bed, text a friend) can help.",
        "Consider a short break from screens and a bit of movement or fresh air.",
        "Listen to something calming for a few minutes. You're allowed to pause.",
    ],
    InternalEmotionalState.NEEDS_SUPPORT: [
        "You're not alone. Let's take it slow: try 3 deep breaths right now.",
        "Small steps matter. One thing you can do in the next 5 minutes that feels okay?",
        "A short breathing exercise can help. Breathe in for 4, hold for 2, out for 6. Repeat 3 times.",
        "Reaching out to someone you trust can help. Would you like to try a short breathing exercise first?",
    ],
}

BREATHING_EXERCISES = [
    "4-2-6: Breathe in for 4 counts, hold for 2, out for 6. Repeat 3–5 times.",
    "Box breathing: In 4, hold 4, out 4, hold 4. Repeat 4 times.",
    "Calm exhale: Breathe in gently, then exhale slowly — make the out-breath longer than the in-breath.",
]

SMALL_TASKS = [
    "Make your bed or tidy one small area.",
    "Send a short message to someone you care about.",
    "Step outside for 2 minutes or open a window.",
    "Drink a glass of water.",
    "Do one thing you've been putting off for 5 minutes only.",
]

CALM_MUSIC_SUGGESTIONS = [
    "Try ambient or nature sounds (rain, waves, soft piano).",
    "Lo-fi or acoustic playlists can be soothing.",
    "Instrumental music without lyrics often helps when you need to slow down.",
]


def get_suggestions(level: RiskLevel, count: int = 2) -> list[str]:
    """Legacy: by risk level. Maps to internal state for consistency."""
    state = {
        RiskLevel.LOW: InternalEmotionalState.STABLE,
        RiskLevel.MEDIUM: InternalEmotionalState.MILD_CONCERN,
        RiskLevel.HIGH: InternalEmotionalState.NEEDS_SUPPORT,
    }.get(level, InternalEmotionalState.STABLE)
    return get_suggestions_for_state(state, count)


def get_suggestions_for_state(internal_state: InternalEmotionalState | None, count: int = 3) -> list[str]:
    """Suggestions by internal emotional state. Non-clinical."""
    state = internal_state or InternalEmotionalState.STABLE
    opts = SUGGESTIONS.get(state, SUGGESTIONS[InternalEmotionalState.STABLE])
    return random.sample(opts, min(count, len(opts)))


def get_breathing(count: int = 1) -> list[str]:
    return random.sample(BREATHING_EXERCISES, min(count, len(BREATHING_EXERCISES)))


def get_small_tasks(count: int = 1) -> list[str]:
    return random.sample(SMALL_TASKS, min(count, len(SMALL_TASKS)))


def get_calm_music(count: int = 1) -> list[str]:
    return random.sample(CALM_MUSIC_SUGGESTIONS, min(count, len(CALM_MUSIC_SUGGESTIONS)))


def get_healing_response(
    internal_state: InternalEmotionalState | None,
    has_trusted_contact_consent: bool,
    trusted_contact_name: str | None,
) -> dict:
    """
    Returns suggestions + optional gentle escalation message.
    Escalation only when NEEDS_SUPPORT and user has consented to contact suggestion.
    Never diagnostic; user always in control.
    """
    state = internal_state or InternalEmotionalState.STABLE
    suggestions = get_suggestions_for_state(state, 3)
    breathing = get_breathing(1)
    tasks = get_small_tasks(1)
    music = get_calm_music(1)

    escalation_message = None
    if state == InternalEmotionalState.NEEDS_SUPPORT and has_trusted_contact_consent:
        if trusted_contact_name:
            escalation_message = (
                f"If you'd like extra support, you could reach out to {trusted_contact_name}, "
                "or to a professional who can listen. You're in control — no pressure."
            )
        else:
            escalation_message = (
                "If you'd like extra support, talking to someone you trust or a professional "
                "can help. You're in control — no pressure."
            )

    return {
        "suggestions": suggestions,
        "breathing": breathing,
        "small_tasks": tasks,
        "calm_music": music,
        "escalation_message": escalation_message,
    }
