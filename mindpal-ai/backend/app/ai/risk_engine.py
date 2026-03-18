"""
Multimodal risk engine: combines PHQ-9, mood, face, text, voice, behavior.
Output: Low / Medium / High risk score.
"""
from datetime import datetime, timedelta
from typing import Tuple, Any, Dict, Optional

from app.config import get_settings
from app.models.risk import RiskLevel, RiskScore, InternalEmotionalState

_settings = get_settings()


async def compute_risk(
    db,
    user_id: str,
) -> RiskScore:
    """
    Aggregate signals and compute mental wellness risk.
    Demo: rule-based. Production: can use sklearn RandomForest.
    """
    factors = []
    score = 0.0
    total_weight = 0.0

    # PHQ-9 latest (weight high)
    phq_cursor = db.phq9.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    phq_docs = await phq_cursor.to_list(length=1)
    phq = phq_docs[0] if phq_docs else None
    phq_total: Optional[int] = phq["total_score"] if phq else None
    if phq:
        s = phq["total_score"] / 27.0
        score += s * 0.35
        total_weight += 0.35
        if phq["total_score"] >= 10:
            factors.append("phq9_elevated")

    # Mood trend last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    mood_cursor = db.mood_entries.find({
        "user_id": user_id,
        "created_at": {"$gte": week_ago},
    })
    mood_vals = []
    async for m in mood_cursor:
        v = {"happy": 0, "neutral": 0.5, "sad": 0.8, "stressed": 0.9}.get(m["mood"], 0.5)
        mood_vals.append(v)
    if mood_vals:
        avg_mood = sum(mood_vals) / len(mood_vals)
        score += avg_mood * 0.2
        total_weight += 0.2
        if avg_mood > 0.6:
            factors.append("mood_trend_negative")

    # Face emotion snaps last 7 days
    emotion_cursor = db.emotion_snaps.find({
        "user_id": user_id,
        "created_at": {"$gte": week_ago},
    })
    emo_vals = []
    async for e in emotion_cursor:
        v = {"happy": 0, "neutral": 0.4, "tired": 0.5, "sad": 0.7, "stressed": 0.8, "angry": 0.9}.get(e["emotion"], 0.4)
        emo_vals.append(v * e.get("confidence", 1))
    if emo_vals:
        avg_emo = sum(emo_vals) / len(emo_vals)
        score += avg_emo * 0.2
        total_weight += 0.2
        if avg_emo > 0.6:
            factors.append("face_emotion_negative")

    # Journal sentiment + emotional pattern last 7 days
    journal_cursor = db.journal_entries.find({
        "user_id": user_id,
        "created_at": {"$gte": week_ago},
    })
    sent_vals = []
    recent_emotions = []
    recent_stress = []
    recent_strength = []
    async for j in journal_cursor:
        s = j.get("sentiment_score", 0)
        sent_vals.append((1 - s) / 2)  # map -1..1 to 1..0
        if "emotion_label" in j:
            recent_emotions.append(j["emotion_label"])
        if "stress_level" in j:
            recent_stress.append(j["stress_level"])
        if "last_journal_strength" in j:
            recent_strength.append(j["last_journal_strength"])
    persistent_negative = False
    emotional_strength = 0.0
    stress_category = "low"
    avg_sent: Optional[float] = None
    if sent_vals:
        avg_sent = sum(sent_vals) / len(sent_vals)
        score += avg_sent * 0.1
        total_weight += 0.1
        if avg_sent > 0.5:
            factors.append("journal_sentiment_negative")
    if recent_emotions:
        negative_emotions = {"sad", "anxious", "overwhelmed", "tired"}
        negative_count = sum(1 for e in recent_emotions if e in negative_emotions)
        if negative_count >= max(3, len(recent_emotions) // 2 + 1):
            persistent_negative = True
            factors.append("journal_trend_negative")
    if recent_stress:
        # Use most recent stress label
        stress_category = recent_stress[-1]
    if recent_strength:
        emotional_strength = max(0.0, min(1.0, sum(recent_strength) / len(recent_strength)))

    # Behavior: sleep, activity (optional)
    behavior_cursor = db.behavior_entries.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    behavior_docs = await behavior_cursor.to_list(length=1)
    behavior = behavior_docs[0] if behavior_docs else None
    if behavior:
        # Low sleep, low activity -> higher risk
        sleep_risk = 0 if behavior["sleep_hours"] >= 7 else (7 - behavior["sleep_hours"]) / 7 * 0.5
        activity_risk = (5 - behavior["activity_level"]) / 5 * 0.5
        score += (sleep_risk + activity_risk) * 0.1
        total_weight += 0.1
        if behavior["sleep_hours"] < 6:
            factors.append("low_sleep")

    # Emotional baseline (choice-based) – use latest summary_scores
    baseline_cursor = db.emotional_baselines.find({"user_id": user_id}).sort("created_at", -1).limit(1)
    baseline_docs = await baseline_cursor.to_list(length=1)
    baseline = baseline_docs[0] if baseline_docs else None
    baseline_percent: Optional[float] = None
    emotional_profile: Dict[str, Any] = {}
    if baseline:
        scores: Dict[str, int] = baseline.get("summary_scores", {}) or {}
        if scores:
            raw = float(sum(scores.values()))
            max_raw = float(len(scores) * 4)  # 0-4 per dimension
            if max_raw > 0:
                baseline_percent = (raw / max_raw) * 100.0

            # Build simple internal emotional profile (not exposed)
            stress_score = float(scores.get("stress", 0))
            energy_score = float(scores.get("energy", 0))
            connection_score = float(scores.get("connection", 0))
            mood_score = float(scores.get("usual_mood", 0))

            if baseline_percent is not None:
                if baseline_percent >= 60 or (phq_total or 0) >= 15:
                    emotional_burden = "high"
                elif baseline_percent >= 30 or (phq_total or 0) >= 5:
                    emotional_burden = "medium"
                else:
                    emotional_burden = "low"
            else:
                emotional_burden = "low"

            if stress_score >= 3:
                stress_level_profile = "high"
            elif stress_score >= 1:
                stress_level_profile = "medium"
            else:
                stress_level_profile = "low"

            energy_level_profile = "low" if energy_score >= 2 else "good"

            if connection_score >= 3:
                social_openness = "withdrawn"
            elif connection_score >= 1:
                social_openness = "mixed"
            else:
                social_openness = "open"

            emotional_profile = {
                "emotional_burden": emotional_burden,
                "stress_level": stress_level_profile,
                "energy_level": energy_level_profile,
                "social_openness": social_openness,
            }

    # Hybrid initial risk from PHQ + baseline (internal, additive)
    if phq_total is not None and baseline_percent is not None:
        initial_risk_percent = (phq_total * 0.6) + (baseline_percent * 0.4)
        # Normalize 0-100 → 0-1 and blend as an extra factor
        initial_norm = max(0.0, min(1.0, initial_risk_percent / 100.0))
        score += initial_norm * 0.2
        total_weight += 0.2
        factors.append("baseline_phq_profile")

    if total_weight > 0:
        score = score / total_weight
    score = min(1.0, max(0.0, score))

    # Base level from aggregated score
    if score < 0.35:
        level = RiskLevel.LOW
        internal_state = InternalEmotionalState.STABLE
    elif score < 0.65:
        level = RiskLevel.MEDIUM
        internal_state = InternalEmotionalState.MILD_CONCERN
    else:
        level = RiskLevel.HIGH
        internal_state = InternalEmotionalState.NEEDS_SUPPORT

    # Context-aware adjustment using stress, emotional_strength, fatigue and trend.
    # High risk ONLY when: high stress + high intensity + persistent negative trend.
    if stress_category == "high" and emotional_strength >= 0.7 and persistent_negative:
        level = RiskLevel.HIGH
        internal_state = InternalEmotionalState.NEEDS_SUPPORT
        if score < 0.7:
            score = 0.7
        factors.append("journal_high_stress_high_intensity_trend")
    else:
        # If conditions for high risk not met, cap at MEDIUM even if base score was high.
        if level == RiskLevel.HIGH:
            level = RiskLevel.MEDIUM
            internal_state = InternalEmotionalState.MILD_CONCERN
            if score > 0.64:
                score = 0.64

    now = datetime.utcnow()

    # Prepare ML-ready feature vector (stored, not used unless a model is plugged in)
    ml_features: Dict[str, Any] = {
        "phq_total": phq_total,
        "baseline_percent": baseline_percent,
        "mood_avg": avg_mood if mood_vals else None,
        "sleep_estimate": behavior["sleep_hours"] if behavior else None,
        "sentiment_score": avg_sent if avg_sent is not None else None,
    }

    # Persist latest risk (internal_state for healing only; never show to user)
    await db.risk_scores.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "level": level.value,
            "score": score,
            "factors": factors,
            "internal_state": internal_state.value,
            "updated_at": now,
            "emotional_profile": emotional_profile,
            "ml_features": ml_features,
        }},
        upsert=True,
    )

    return RiskScore(
        level=level,
        score=round(score, 2),
        factors=factors,
        updated_at=now,
        internal_state=internal_state,
    )
