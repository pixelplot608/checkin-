/**
 * Support: gentle suggestions (breathing, tasks, music).
 * Optional escalation message only when user has consented to trusted contact.
 * No risk labels, no diagnosis.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HelpMap from '../components/HelpMap'

type SupportData = {
  suggestions: string[]
  breathing: string[]
  small_tasks: string[]
  calm_music: string[]
  escalation_message?: string | null
}

type NearbyPlace = {
  name: string
  address?: string
  rating?: number
  distance_km?: number
  maps_url?: string
  phone?: string | null
  lat?: number
  lon?: number
}

export default function Support() {
  const { fetchApi } = useAuth()
  const [data, setData] = useState<SupportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [riskLevel, setRiskLevel] = useState<string>('')

  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[] | null>(null)
  const [nearbyShownOnce, setNearbyShownOnce] = useState(false)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)

  const [trustedEnabled, setTrustedEnabled] = useState(false)
  const [trustedRelationship, setTrustedRelationship] = useState('')
  const [trustedName, setTrustedName] = useState('')
  const [trustedPhone, setTrustedPhone] = useState('')
  const [trustedEmail, setTrustedEmail] = useState('')
  const [trustedConsent, setTrustedConsent] = useState(false)
  const [trustedSaving, setTrustedSaving] = useState(false)
  const [trustedSaved, setTrustedSaved] = useState(false)
  const [trustedError, setTrustedError] = useState<string | null>(null)
  const [trustedLoaded, setTrustedLoaded] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem('nearby_help')
    if (cached) {
      try {
        const list = JSON.parse(cached)
        if (Array.isArray(list) && list.length > 0) setNearbyPlaces(list)
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    fetchApi('/support')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d)
      })
      .finally(() => setLoading(false))
  }, [fetchApi])

  useEffect(() => {
    fetchApi('/risk/cached')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.level) setRiskLevel(d.level)
      })
      .catch(() => {})
  }, [fetchApi])

  useEffect(() => {
    if (riskLevel !== 'high') return
    if (nearbyPlaces && nearbyPlaces.length > 0) return
    if (!navigator.geolocation) return
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserPosition({ lat: latitude, lng: longitude })
        fetchApi(`/support/nearby-help?lat=${latitude}&lng=${longitude}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const places = (d && Array.isArray(d.places) ? d.places : []) as NearbyPlace[]
            setNearbyPlaces(places)
            if (places.length > 0) {
              try { localStorage.setItem('nearby_help', JSON.stringify(places)) } catch { /* ignore */ }
            }
          })
          .catch(() => setNearbyError('Could not fetch nearby help right now.'))
          .finally(() => setNearbyLoading(false))
      },
      () => {
        setNearbyLoading(false)
        setNearbyError('Location access helps us find nearby mental health professionals.')
      },
      { timeout: 10000 }
    )
  }, [riskLevel, fetchApi])

  useEffect(() => {
    fetchApi('/trusted-contact')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.has_contact) {
          setTrustedName(d.name || '')
          setTrustedRelationship(d.relation || '')
          setTrustedConsent(!!d.consent_to_contact)
          setTrustedEnabled(true)
        }
      })
      .catch(() => {})
      .finally(() => setTrustedLoaded(true))
  }, [fetchApi])

  const handleSaveTrustedContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trustedConsent) {
      setTrustedError('Please confirm you give permission to notify this trusted person.')
      return
    }
    if (!trustedName.trim() || !trustedPhone.trim()) {
      setTrustedError('Name and phone number are required.')
      return
    }
    setTrustedError(null)
    setTrustedSaving(true)
    try {
      const res = await fetchApi('/trusted-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trustedName.trim(),
          phone: trustedPhone.trim(),
          email: trustedEmail.trim() || null,
          relation: trustedRelationship || null,
          consent_to_contact: trustedConsent,
        }),
      })
      if (res.ok) {
        setTrustedSaved(true)
        setTimeout(() => setTrustedSaved(false), 4000)
      } else {
        setTrustedError('Something went wrong. Please try again in a moment.')
      }
    } catch {
      setTrustedError('Something went wrong. Please try again in a moment.')
    } finally {
      setTrustedSaving(false)
    }
  }

  const handleFindNearbyHelp = () => {
    if (nearbyShownOnce) return
    if (!navigator.geolocation) {
      setNearbyError('Location access is not available in this browser.')
      return
    }
    setNearbyError(null)
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserPosition({ lat: latitude, lng: longitude })
        fetchApi(`/support/nearby-help?lat=${latitude}&lng=${longitude}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d && Array.isArray(d.places)) {
              setNearbyPlaces(d.places)
              setNearbyShownOnce(true)
            } else {
              setNearbyPlaces([])
            }
          })
          .catch(() => {
            setNearbyError('Could not fetch nearby help right now.')
          })
          .finally(() => setNearbyLoading(false))
      },
      () => {
        setNearbyLoading(false)
        setNearbyError('Location access helps us find nearby mental health professionals.')
      },
      { timeout: 10000 }
    )
  }

  if (loading) return <p className="text-[#5a5a5a]">Loading...</p>
  if (!data) return <p className="text-[#5a5a5a]">Could not load suggestions.</p>

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Gentle support</h1>
      <p className="text-[#5a5a5a]">
        A few ideas that might help — breathing, small tasks, calm sounds. No pressure. You choose what feels right.
      </p>

      {data.suggestions?.length > 0 && (
        <div className="theme-card rounded-[16px] border border-[#e0dce8] bg-white/95 p-4">
          <h2 className="font-semibold text-[#2c2c2c] mb-2">For you right now</h2>
          <ul className="list-disc list-inside text-[#5a5a5a] space-y-1">
            {data.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {data.breathing?.length > 0 && (
        <div className="theme-card rounded-[16px] border border-green-200 bg-green-50/50 p-4">
          <h2 className="font-semibold text-[#2c2c2c] mb-2">Breathing</h2>
          <p className="text-[#2c2c2c]">{data.breathing[0]}</p>
        </div>
      )}

      {data.small_tasks?.length > 0 && (
        <div className="theme-card rounded-[16px] border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="font-semibold text-[#2c2c2c] mb-2">One small task</h2>
          <p className="text-[#2c2c2c]">{data.small_tasks[0]}</p>
        </div>
      )}

      {data.calm_music?.length > 0 && (
        <div className="theme-card rounded-[16px] border border-blue-200 bg-blue-50/50 p-4">
          <h2 className="font-semibold text-[#2c2c2c] mb-2">Calm sounds</h2>
          <p className="text-[#2c2c2c]">{data.calm_music[0]}</p>
        </div>
      )}

      {data.escalation_message && (
        <div className="theme-card rounded-[16px] border border-[#c4b8e0] bg-[#f8f5ff] p-4">
          <p className="text-[#2c2c2c] text-sm">{data.escalation_message}</p>
          <Link to="/trusted-contact" className="text-sm text-[#7c6bb8] hover:underline mt-2 inline-block">
            Update trusted contact
          </Link>
        </div>
      )}

      <div className="theme-card rounded-[16px] border border-red-200 bg-red-50/40 p-4 space-y-2">
        <h2 className="font-semibold text-red-800">Nearby professional help</h2>
        <p className="text-sm text-red-700">
          If things feel very heavy, talking to a mental health professional might help. With your permission, we can
          look up nearby options for you (free map, no billing).
        </p>
        {nearbyLoading && (
          <p className="text-sm text-[#5a5a5a]">Finding nearby professionals near you...</p>
        )}
        <button
          type="button"
          onClick={handleFindNearbyHelp}
          disabled={nearbyLoading || nearbyShownOnce}
          className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {nearbyLoading ? 'Finding nearby help…' : nearbyShownOnce ? 'Suggestions shown this session' : 'Find nearby help'}
        </button>
        {nearbyError && <p className="text-xs text-red-700 mt-1">{nearbyError}</p>}

        {((nearbyPlaces && nearbyPlaces.length > 0) || userPosition) && (
          <>
            {nearbyPlaces && nearbyPlaces.length > 0 && (
              <p className="text-sm text-gray-700 mt-3">
                You&apos;re not alone. Talking to a professional may help. Here are nearby mental health professionals.
              </p>
            )}
            <p className="text-sm text-gray-600 mt-3 mb-1">
              We&apos;re gently looking for nearby professional support options for you.
            </p>
            <HelpMap places={(nearbyPlaces ?? []) as { name: string; lat: number; lon: number; address?: string; maps_url?: string }[]} userPosition={userPosition} />
            {nearbyPlaces && nearbyPlaces.length > 0 && (
            <div className="mt-3 space-y-2">
              {nearbyPlaces.map((p, idx) => (
                <div key={idx} className="rounded-lg border border-red-100 bg-white p-3 text-sm space-y-1">
                  <p className="font-semibold text-[#2c2c2c]">{p.name}</p>
                  {p.address && <p className="text-[#5a5a5a]">{p.address}</p>}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5a5a5a]">
                    {typeof p.rating === 'number' && <span>Rating: {p.rating.toFixed(1)} ⭐</span>}
                    {typeof p.distance_km === 'number' && <span>Distance: {p.distance_km} km</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="theme-btn px-2 py-1 rounded-lg border border-[#e0dce8] text-xs text-[#2c2c2c] hover:bg-[#f8f5ff]"
                      >
                        Call
                      </a>
                    )}
                    {p.maps_url && (
                      <a
                        href={p.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-md bg-mindpal-primary text-xs text-white hover:bg-mindpal-secondary"
                      >
                        Open in map
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </div>

      {/* Trusted Safety & Parental Support — optional, below nearby help */}
      <div className="rounded-[16px] border border-[#e0dce8] bg-[#f8f5ff]/60 p-4 space-y-4 shadow-sm">
        <h2 className="font-semibold text-[#2c2c2c]">Trusted Safety & Parental Support</h2>
        <p className="text-sm text-[#5a5a5a]">
          You can choose a trusted person (parent, guardian, or close contact) who can be gently notified if you ever
          feel very overwhelmed. This is optional and always under your control.
        </p>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={trustedEnabled}
            onChange={(e) => {
              setTrustedEnabled(e.target.checked)
              if (!e.target.checked) setTrustedError(null)
            }}
            className="w-5 h-5 rounded border-[#c4b8e0] text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium text-[#2c2c2c]">Enable trusted safety support</span>
        </label>

        {trustedEnabled && (
          <form onSubmit={handleSaveTrustedContact} className="space-y-3 pt-2 border-t border-[#e0dce8]">
            <label className="block">
              <span className="text-sm text-[#5a5a5a]">Relationship</span>
              <select
                value={trustedRelationship}
                onChange={(e) => setTrustedRelationship(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#e0dce8] rounded-xl bg-white text-[#2c2c2c] text-sm focus:ring-2 focus:ring-[#c4b8e0] focus:border-transparent"
              >
                <option value="">Select…</option>
                <option value="Parent">Parent</option>
                <option value="Guardian">Guardian</option>
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-[#5a5a5a]">Name</span>
              <input
                type="text"
                value={trustedName}
                onChange={(e) => setTrustedName(e.target.value)}
                placeholder="Their name"
                className="mt-1 w-full px-3 py-2 border border-[#e0dce8] rounded-xl bg-white text-[#2c2c2c] text-sm focus:ring-2 focus:ring-[#c4b8e0] focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#5a5a5a]">Phone number</span>
              <input
                type="tel"
                value={trustedPhone}
                onChange={(e) => setTrustedPhone(e.target.value)}
                placeholder="Their phone"
                className="mt-1 w-full px-3 py-2 border border-[#e0dce8] rounded-xl bg-white text-[#2c2c2c] text-sm focus:ring-2 focus:ring-[#c4b8e0] focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#5a5a5a]">Email (optional)</span>
              <input
                type="email"
                value={trustedEmail}
                onChange={(e) => setTrustedEmail(e.target.value)}
                placeholder="Their email"
                className="mt-1 w-full px-3 py-2 border border-[#e0dce8] rounded-xl bg-white text-[#2c2c2c] text-sm focus:ring-2 focus:ring-[#c4b8e0] focus:border-transparent"
              />
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={trustedConsent}
                onChange={(e) => setTrustedConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#c4b8e0] text-[#7c6bb8] focus:ring-[#c4b8e0]"
              />
              <span className="text-sm text-[#2c2c2c]">
                I give permission to notify this trusted person if I am in serious emotional distress.
              </span>
            </label>
            <button
              type="submit"
              disabled={trustedSaving}
              className="px-4 py-2 rounded-xl bg-[#7c6bb8] text-white text-sm font-medium hover:bg-[#6b5ba8] disabled:opacity-50 transition-colors"
            >
              {trustedSaving ? 'Saving…' : 'Save Trusted Contact'}
            </button>
            {trustedSaved && <p className="text-sm text-green-700">Saved. Your trusted contact is updated.</p>}
            {trustedError && <p className="text-sm text-amber-700">{trustedError}</p>}
          </form>
        )}

        {trustedLoaded && (
          <p className="text-xs text-[#5a5a5a] pt-1">
            You can edit or remove this anytime in{' '}
            <Link to="/trusted-contact" className="text-[#7c6bb8] hover:underline">
              Settings
            </Link>
            . Nothing is shared without your permission.
          </p>
        )}
      </div>
    </div>
  )
}
