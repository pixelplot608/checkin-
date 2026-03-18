import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type ProfileData = {
  full_name: string
  username: string
  email: string
  phone: string
  age: string
  gender: string
  date_of_birth: string
  location: string
  emotional_baseline: string | null
  phq9_score: number | null
  joined_date: string | null
  trusted_contact: {
    name?: string | null
    relation?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

const GENDER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

export default function Profile() {
  const { fetchApi } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchApi('/profile/me')
        if (cancelled) return
        if (!res.ok) {
          setProfile(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
        setAge(data.age ?? '')
        setGender(data.gender ?? '')
        setDob(data.date_of_birth ?? '')
        setCity(data.location ?? '')
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchApi])

  const handleSave = async () => {
    setError('')
    setSuccess('')
    try {
      setSaving(true)
      const res = await fetchApi('/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName || null,
          phone: phone || null,
          age: age || null,
          gender: gender || null,
          date_of_birth: dob || null,
          location: city || null,
        }),
      })
      if (!res.ok) {
        setError('Could not update profile. Please try again.')
        return
      }
      setSuccess('Profile updated successfully 🌿')
      setViewMode(true)
      setProfile((p) =>
        p
          ? {
              ...p,
              full_name: fullName,
              phone,
              age,
              gender,
              date_of_birth: dob,
              location: city,
            }
          : null
      )
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
      setAge(profile.age ?? '')
      setGender(profile.gender ?? '')
      setDob(profile.date_of_birth ?? '')
      setCity(profile.location ?? '')
    }
    setViewMode(true)
    setError('')
  }

  if (loading) return <p className="text-[#5a5a5a]">Loading profile...</p>
  if (!profile) return <p className="text-[#5a5a5a]">Could not load profile.</p>

  const inputClass = 'mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80'
  const readOnlyClass = 'mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-gray-50 opacity-90'

  return (
    <div className="space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Personal Info</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Section 1 — Basic Info */}
      <div className="theme-card rounded-[16px] p-6 bg-[#f8f5ff]/90 border border-[#e8e4f0]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Basic Info</h2>
        <div className="grid gap-4">
          <label className="block text-sm text-[#5a5a5a]">
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={viewMode}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Username
            <input type="text" value={profile.username} readOnly className={readOnlyClass} />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Email
            <input type="text" value={profile.email} readOnly className={readOnlyClass} />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Phone Number
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={viewMode}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {/* Section 2 — Personal Details */}
      <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Personal Details</h2>
        <div className="grid gap-4">
          <label className="block text-sm text-[#5a5a5a]">
            Age
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={viewMode}
              min={1}
              max={120}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={viewMode}
              className={inputClass}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value || 'blank'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Date of Birth
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={viewMode}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            City / Location
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={viewMode}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {/* Section 3 — Wellness Info (read-only) */}
      <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Wellness Info</h2>
        <div className="grid gap-3 text-sm">
          <p className="text-[#5a5a5a]">
            <span className="font-medium text-[#2c2c2c]">Emotional baseline score:</span>{' '}
            {profile.emotional_baseline ?? '—'}
          </p>
          <p className="text-[#5a5a5a]">
            <span className="font-medium text-[#2c2c2c]">PHQ-9 score:</span>{' '}
            {profile.phq9_score != null ? String(profile.phq9_score) : '—'}
          </p>
          <p className="text-[#5a5a5a]">
            <span className="font-medium text-[#2c2c2c]">Joined date:</span>{' '}
            {profile.joined_date ?? '—'}
          </p>
        </div>
      </div>

      {/* Section 4 — Trusted Contact */}
      {profile.trusted_contact && (
        <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
          <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Trusted Contact</h2>
          <div className="grid gap-2 text-sm">
            <p className="text-[#5a5a5a]">
              <span className="font-medium text-[#2c2c2c]">Name:</span> {profile.trusted_contact.name ?? '—'}
            </p>
            <p className="text-[#5a5a5a]">
              <span className="font-medium text-[#2c2c2c]">Relation:</span> {profile.trusted_contact.relation ?? '—'}
            </p>
            <p className="text-[#5a5a5a]">
              <span className="font-medium text-[#2c2c2c]">Phone:</span> {profile.trusted_contact.phone ?? '—'}
            </p>
            <p className="text-[#5a5a5a]">
              <span className="font-medium text-[#2c2c2c]">Email:</span> {profile.trusted_contact.email ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* Edit / Save / Cancel */}
      <div className="flex gap-3">
        {viewMode ? (
          <button
            type="button"
            onClick={() => setViewMode(false)}
            className="theme-btn px-4 py-2 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a0d0]"
          >
            Edit Profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="theme-btn px-4 py-2 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a0d0] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-[#e0dce8] text-sm text-[#2c2c2c]"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
