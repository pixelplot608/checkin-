"""
Free, privacy-safe nearby mental health help via OpenStreetMap Overpass API.
No billing, no paid APIs. Raw location is never stored.
"""
from typing import Any

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


async def find_nearby_psychiatrists(lat: float, lon: float) -> list[dict[str, Any]]:
    """
    Query Overpass API for healthcare / hospital / clinic nodes within ~5 km.
    Returns up to 5 places with name, lat, lon. No permanent location storage.
    """
    query = f"""
[out:json];
(
  node["healthcare"](around:5000,{lat},{lon});
  node["amenity"="hospital"](around:5000,{lat},{lon});
  node["amenity"="clinic"](around:5000,{lat},{lon});
  node["amenity"="doctors"](around:5000,{lat},{lon});
);
out;
"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(OVERPASS_URL, content=query.encode("utf-8"))
            res.raise_for_status()
            data = res.json()
    except Exception:
        return []

    results: list[dict[str, Any]] = []
    seen: set[tuple[float, float]] = set()
    for el in data.get("elements", []):
        if el.get("type") != "node":
            continue
        el_lat = el.get("lat")
        el_lon = el.get("lon")
        if el_lat is None or el_lon is None:
            continue
        key = (round(float(el_lat), 5), round(float(el_lon), 5))
        if key in seen:
            continue
        seen.add(key)
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("brand") or "Mental health professional"
        address = tags.get("addr:street") or tags.get("address")
        if address and tags.get("addr:housenumber"):
            address = f"{tags.get('addr:housenumber')} {address}".strip()
        maps_url = f"https://www.openstreetmap.org/?mlat={el_lat}&mlon={el_lon}#map=17/{el_lat}/{el_lon}"
        results.append({
            "name": name,
            "lat": float(el_lat),
            "lon": float(el_lon),
            "address": address,
            "maps_url": maps_url,
        })
        if len(results) >= 5:
            break
    return results
