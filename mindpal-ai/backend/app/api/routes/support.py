"""
Support & healing: gentle suggestions from internal state.
Never exposes risk level or internal_state to user in the main support endpoint.
Ethical escalation only when NEEDS_SUPPORT + user consent.

High-risk safety: when risk is HIGH and user sends lat/lon, returns nearby
mental health professionals via FREE OpenStreetMap Overpass API. Raw location
is never stored; only help_suggested + timestamp. Optional Google Places
fallback if GOOGLE_MAPS_API_KEY is set.
"""
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Query

from app.config import get_settings
from app.database import get_db
from app.api.deps import get_current_user_id
from app.ai.risk_engine import compute_risk
from app.ai.healing_engine import get_healing_response
from app.models.risk import InternalEmotionalState, RiskLevel
from app.services.location_support import find_nearby_psychiatrists

router = APIRouter(prefix="/support", tags=["support"])
_settings = get_settings()


@router.get("")
async def get_support(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Returns gentle suggestions (breathing, tasks, music) and optionally
    a non-alarming escalation message (only if user has consented to trusted contact).
    Never returns risk level or internal state labels.
    """
    risk = await compute_risk(db, user_id)
    internal_state = getattr(risk, "internal_state", None) or InternalEmotionalState.STABLE

    # Trusted contact: only for optional escalation message
    tc = await db.trusted_contacts.find_one({"user_id": user_id})
    has_consent = bool(tc and tc.get("consent_to_contact"))
    tc_name = tc.get("name") if tc else None

    response = get_healing_response(internal_state, has_consent, tc_name)
    return response


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Approximate distance between two lat/lng points in kilometers.
    """
    rlat1, rlon1, rlat2, rlon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return 6371.0 * c


@router.get("/nearby-help")
async def get_nearby_help(
    lat: float = Query(..., description="Latitude from browser geolocation"),
    lng: float = Query(..., description="Longitude from browser geolocation"),
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    High-risk safety helper. Triggered ONLY when risk.level == 'high'.

    - Uses FREE OpenStreetMap Overpass API to find nearby healthcare/hospitals/clinics.
    - Does NOT store raw location; only records help_suggested + timestamp.
    - If Overpass returns no results and GOOGLE_MAPS_API_KEY is set, falls back to Google Places.
    """
    risk = await compute_risk(db, user_id)
    if risk.level != RiskLevel.HIGH:
        return {"places": [], "help_suggested": False}

    places: list[dict[str, Any]] = []

    # 1) Free path: Overpass API
    try:
        places = await find_nearby_psychiatrists(lat, lng)
        for p in places:
            p.setdefault("distance_km", round(_haversine_km(lat, lng, p["lat"], p["lon"]), 1))
    except Exception:
        pass

    # 2) Optional fallback: Google Places only if no Overpass results and key set
    if not places and _settings.GOOGLE_MAPS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                    params={
                        "location": f"{lat},{lng}",
                        "radius": 5000,
                        "type": "doctor",
                        "keyword": "psychiatrist",
                        "key": _settings.GOOGLE_MAPS_API_KEY,
                    },
                )
            data = resp.json()
            for r in data.get("results", [])[:5]:
                loc = r.get("geometry", {}).get("location") or {}
                plat, plng = loc.get("lat"), loc.get("lng")
                if plat is None or plng is None:
                    continue
                places.append({
                    "name": r.get("name"),
                    "address": r.get("vicinity") or r.get("formatted_address"),
                    "rating": r.get("rating"),
                    "distance_km": round(_haversine_km(lat, lng, float(plat), float(plng)), 1),
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query={plat},{plng}",
                    "lat": float(plat),
                    "lon": float(plng),
                    "phone": None,
                })
        except Exception:
            pass

    if places:
        now = datetime.utcnow()
        await db.risk_scores.update_one(
            {"user_id": user_id},
            {"$set": {"help_suggested": True, "help_suggested_at": now}},
            upsert=True,
        )

    return {"places": places, "help_suggested": bool(places)}
