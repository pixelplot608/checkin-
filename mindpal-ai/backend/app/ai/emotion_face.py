"""
Face emotion detection.
Demo mode: random/simulated. Production: MediaPipe + emotion model or API.
"""
import random
from app.config import get_settings

_settings = get_settings()
EMOTIONS = ["happy", "sad", "stressed", "tired", "neutral", "angry"]


def detect_emotion_from_image(image_bytes: bytes | None = None) -> dict:
    """
    Returns { "emotion": str, "confidence": float }.
    Demo: random. Production: run face detection + emotion model.
    """
    if _settings.DEMO_MODE or not image_bytes:
        return {
            "emotion": random.choice(EMOTIONS),
            "confidence": round(random.uniform(0.6, 0.98), 2),
        }
    # TODO: MediaPipe face + emotion CNN
    return {
        "emotion": random.choice(EMOTIONS),
        "confidence": round(random.uniform(0.6, 0.98), 2),
    }
