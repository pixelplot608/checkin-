/**
 * Free OSM map: user location + nearby mental health places.
 * Uses Leaflet + OpenStreetMap tiles. Nearby search via Overpass API (no API key).
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

export type HelpMapPlace = {
  name: string
  lat: number
  lon: number
  address?: string
  maps_url?: string
  type?: string
  distance_km?: number
}

const MAP_HEIGHT = 450
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_RADIUS_M = 5000
const OVERPASS_TIMEOUT_MS = 6000

const overpassCache: Record<string, HelpMapPlace[]> = {}
function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(4)}-${lon.toFixed(4)}`
}

// Default marker icon (fix for bundlers)
if (typeof L !== 'undefined') {
  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })
  L.Marker.prototype.options.icon = defaultIcon
}

function buildYouAreHereIcon(): L.DivIcon {
  return L.divIcon({
    className: 'you-are-here-marker',
    html: '<div style="background:#2563eb;color:#fff;padding:4px 8px;border-radius:8px;font-size:11px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);">You are here</div>',
    iconSize: [90, 24],
    iconAnchor: [45, 12],
  })
}

function buildProfessionalIcon(): L.DivIcon {
  return L.divIcon({
    className: 'professional-marker',
    html: '<div style="background:#059669;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid #fff;">●</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

type Props = {
  places: HelpMapPlace[] | null
  userPosition?: { lat: number; lng: number } | null
}

function getPlaceType(el: { tags?: Record<string, string> }): string {
  const t = el.tags ?? {}
  if (t.healthcare === 'psychiatrist') return 'Psychiatrist'
  if (t.healthcare === 'psychologist') return 'Psychologist'
  if (t.healthcare === 'mental_health') return 'Mental health'
  if (t.amenity === 'hospital') return 'Hospital'
  if (t.amenity === 'clinic') return 'Clinic'
  return 'Professional support'
}

function OverpassPlacesLoader({
  userLat,
  userLon,
  onLoaded,
  onError,
}: {
  userLat: number
  userLon: number
  onLoaded: (places: HelpMapPlace[]) => void
  onError: () => void
}) {
  const fetched = useRef(false)
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    const key = cacheKey(userLat, userLon)
    const cached = overpassCache[key]
    if (cached !== undefined) {
      onLoaded(cached)
      return
    }
    const query = `[out:json][timeout:6];
(
  node["healthcare"="psychiatrist"](around:5000,${userLat},${userLon});
  node["healthcare"="psychologist"](around:5000,${userLat},${userLon});
  node["healthcare"="mental_health"](around:5000,${userLat},${userLon});
  node["amenity"="hospital"](around:5000,${userLat},${userLon});
  node["amenity"="clinic"](around:5000,${userLat},${userLon});
);
out body;`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS)
    fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeoutId)
        const elements = data?.elements ?? []
        const seen = new Set<string>()
        const list: HelpMapPlace[] = []
        for (const el of elements) {
          const lat = el.lat
          const lon = el.lon
          if (typeof lat !== 'number' || typeof lon !== 'number') continue
          const name = el.tags?.name ?? getPlaceType(el)
          const key = `${lat.toFixed(5)}-${lon.toFixed(5)}`
          if (seen.has(key)) continue
          seen.add(key)
          const address = [el.tags?.['addr:street'], el.tags?.['addr:city'], el.tags?.['addr:postcode']].filter(Boolean).join(', ') || undefined
          const distance_km = haversineKm(userLat, userLon, lat, lon)
          list.push({
            name: name || 'Support',
            lat,
            lon,
            address: address || undefined,
            maps_url: `https://www.google.com/maps?q=${lat},${lon}`,
            type: getPlaceType(el),
            distance_km,
          })
        }
        overpassCache[key] = list
        onLoaded(list)
      })
      .catch(() => {
        clearTimeout(timeoutId)
        onError()
        onLoaded([])
      })
  }, [userLat, userLon, onLoaded, onError])
  return null
}

function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prev = useRef<string>('')
  useEffect(() => {
    const key = `${center[0]}-${center[1]}-${zoom}`
    if (prev.current === key) return
    prev.current = key
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

export default function HelpMap({ places, userPosition }: Props) {
  const [mounted, setMounted] = useState(false)
  const [overpassPlaces, setOverpassPlaces] = useState<HelpMapPlace[] | null>(null)
  const [overpassDone, setOverpassDone] = useState(false)
  const [overpassError, setOverpassError] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const mapRendered = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  const handleOverpassLoaded = useCallback((list: HelpMapPlace[]) => {
    setOverpassPlaces(list)
    setOverpassDone(true)
  }, [])
  const handleOverpassError = useCallback(() => {
    setOverpassError(true)
    setOverpassDone(true)
  }, [])

  const fromProps = (places ?? []).filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number')
  const fromOverpass = overpassPlaces ?? []
  const hasUser = userPosition && typeof userPosition.lat === 'number' && typeof userPosition.lng === 'number'
  const allPlaces = fromProps.length > 0 ? fromProps : fromOverpass
  const center: [number, number] = hasUser
    ? [userPosition!.lat, userPosition!.lng]
    : allPlaces.length > 0
      ? [allPlaces[0].lat, allPlaces[0].lon]
      : [51.5074, -0.1278]

  const shouldFetchOverpass = hasUser && fromProps.length === 0 && !overpassDone
  const showMap = mounted && (hasUser || allPlaces.length > 0)

  if (!mounted) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: MAP_HEIGHT }}>
        <p className="text-[#5a5a5a] text-sm">Loading map…</p>
      </div>
    )
  }

  if (!showMap) {
    return null
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white" style={{ height: MAP_HEIGHT, minHeight: MAP_HEIGHT }}>
      {shouldFetchOverpass && (
        <OverpassPlacesLoader
          userLat={userPosition!.lat}
          userLon={userPosition!.lng}
          onLoaded={handleOverpassLoaded}
          onError={handleOverpassError}
        />
      )}
      <MapContainer
        key="help-map-one"
        center={center}
        zoom={13}
        style={{ height: MAP_HEIGHT, width: '100%' }}
        scrollWheelZoom={false}
        whenReady={() => {
          if (!mapRendered.current) {
            mapRendered.current = true
            setMapLoading(false)
          }
        }}
      >
        <MapCenterController center={center} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasUser && (
          <Marker position={[userPosition!.lat, userPosition!.lng]} icon={buildYouAreHereIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {allPlaces.map((p, i) => (
          <Marker key={`${p.lat}-${p.lon}-${i}`} position={[p.lat, p.lon]} icon={buildProfessionalIcon()}>
            <Popup>
              <span className="font-medium">{p.name}</span>
              {p.type && <p className="text-sm text-gray-600 mt-0.5">{p.type}</p>}
              {p.address && <p className="text-sm text-gray-600 mt-0.5">{p.address}</p>}
              {typeof p.distance_km === 'number' && (
                <p className="text-xs text-gray-500 mt-0.5">About {p.distance_km} km from you</p>
              )}
              {p.maps_url && (
                <a
                  href={p.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-mindpal-primary hover:underline mt-1 inline-block"
                >
                  Tap to open in Google Maps
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none rounded-xl">
          <p className="text-sm text-[#5a5a5a]">Loading map…</p>
        </div>
      )}
      {shouldFetchOverpass && !overpassDone && (
        <div className="absolute inset-x-0 bottom-0 py-2 flex items-center justify-center bg-white/90 text-sm text-[#5a5a5a] rounded-b-xl">
          Finding nearby support…
        </div>
      )}
      {hasUser && fromProps.length === 0 && overpassDone && allPlaces.length === 0 && !overpassError && (
        <div className="absolute inset-x-0 bottom-0 py-3 flex items-center justify-center bg-white/95 text-sm text-[#5a5a5a] rounded-b-xl">
          No nearby professionals found within 5 km.
        </div>
      )}
      {overpassError && (
        <div className="absolute inset-x-0 bottom-0 py-3 flex items-center justify-center bg-amber-50/95 text-sm text-amber-800 rounded-b-xl border-t border-amber-200">
          Unable to fetch nearby help right now.
        </div>
      )}
    </div>
  )
}
