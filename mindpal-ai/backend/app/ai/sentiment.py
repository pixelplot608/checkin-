"""
Text sentiment and emotion classification.
Demo mode: rule-based. Production: HuggingFace pipeline.
"""
from app.config import get_settings

_settings = get_settings()

# Simple keyword-based sentiment + emotion classes for demo (no API cost)
NEGATIVE_WORDS = {
    "sad", "bad", "terrible", "awful", "hate", "angry", "stressed", "anxious",
    "depressed", "lonely", "tired", "hopeless", "worried", "scared", "upset",
}
POSITIVE_WORDS = {
    "happy", "good", "great", "love", "calm", "peaceful", "hopeful", "grateful",
    "excited", "relaxed", "fine", "ok", "okay", "better", "relieved",
}

CALM_WORDS = {"calm", "peaceful", "relaxed", "chill", "steady"}
ANXIOUS_WORDS = {"anxious", "worried", "nervous", "on edge", "panic", "panicky"}
OVERWHELM_WORDS = {"overwhelmed", "overload", "too much", "burned out", "burnt out"}
TIRED_WORDS = {"tired", "exhausted", "sleepy", "drained", "fatigued", "worn out"}
SAD_WORDS = {"sad", "down", "upset", "low", "blue", "lonely", "hopeless"}
POSITIVE_EMOTION_WORDS = {"grateful", "happy", "excited", "glad", "content", "good", "great", "love"}


def _classify_emotion(text: str, score: float) -> str:
    """
    Map sentiment score + keywords to a richer emotion label:
    calm, neutral, tired, sad, anxious, overwhelmed, positive.
    """
    t = text.lower()

    has_anxious = any(w in t for w in ANXIOUS_WORDS)
    has_overwhelmed = any(w in t for w in OVERWHELM_WORDS)
    has_tired = any(w in t for w in TIRED_WORDS)
    has_sad = any(w in t for w in SAD_WORDS)
    has_calm = any(w in t for w in CALM_WORDS)
    has_positive = any(w in t for w in POSITIVE_EMOTION_WORDS)

    # Strong negative + specific categories first
    if has_overwhelmed:
        return "overwhelmed"
    if has_anxious:
        return "anxious"
    if has_tired:
        return "tired"
    if has_sad and score <= -0.1:
        return "sad"

    # Calm / neutral / positive
    if has_calm and score >= -0.1:
        return "calm"
    if has_positive or score > 0.2:
        return "positive"

    # Mildly negative but not strongly categorized
    if score < -0.1:
        return "sad"

    return "neutral"


def analyze_sentiment(text: str) -> dict:
    """
    Returns sentiment_score (-1 to 1), emotion_label.
    In demo mode uses keyword rules; else could use transformers.
    """
    if _settings.DEMO_MODE:
        text_lower = text.lower().split()
        pos = sum(1 for w in text_lower if w in POSITIVE_WORDS)
        neg = sum(1 for w in text_lower if w in NEGATIVE_WORDS)
        if pos + neg == 0:
            score = 0.0
        else:
            score = (pos - neg) / max(pos + neg, 1)
            score = max(-1, min(1, score))
        label = _classify_emotion(text, score)
        return {"sentiment_score": score, "emotion_label": label}

    # Production: use HuggingFace (optional)
    try:
        from transformers import pipeline

        pipe = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        out = pipe(text[:512])[0]
        score = 1.0 if out["label"] == "POSITIVE" else -1.0
        if "score" in out:
            score = out["score"] if out["label"] == "POSITIVE" else -out["score"]
        label = _classify_emotion(text, score)
        return {"sentiment_score": score, "emotion_label": label}
    except Exception:
        # Failsafe: fall back to simple demo rules
        if _settings.DEMO_MODE:
            # Already handled above; just re-call
            return analyze_sentiment(text)
        # If transformers path failed, approximate with DEMO-style logic
        text_lower = text.lower().split()
        pos = sum(1 for w in text_lower if w in POSITIVE_WORDS)
        neg = sum(1 for w in text_lower if w in NEGATIVE_WORDS)
        if pos + neg == 0:
            score = 0.0
        else:
            score = (pos - neg) / max(pos + neg, 1)
            score = max(-1, min(1, score))
        label = _classify_emotion(text, score)
        return {"sentiment_score": score, "emotion_label": label}
