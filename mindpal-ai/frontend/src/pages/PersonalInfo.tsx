import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type Profile = {
  id: string
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

export default function PersonalInfo() {
  const { fetchApi } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [location, setLocation] = useState('')

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
        setDateOfBirth(data.date_of_birth ?? '')
        setLocation(data.location ?? '')
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
          date_of_birth: dateOfBirth || null,
          location: location || null,
        }),
      })
      if (!res.ok) {
        setError('Could not update profile. Please try again.')
        return
      }
      setSuccess('Profile updated')
      setEditing(false)
      setProfile((p) => (p ? { ...p, full_name: fullName, phone, age, gender, date_of_birth: dateOfBirth, location } : null))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-[#5a5a5a]">Loading profile...</p>

  if (!profile) return <p className="text-[#5a5a5a]">Could not load profile.</p>

  return (
    <div className="space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Personal Info</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Basic Info */}
      <div className="theme-card rounded-[16px] p-6 bg-[#f8f5ff]/90 border border-[#e8e4f0]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Basic Info</h2>
        <div className="grid gap-4">
          <label className="block text-sm text-[#5a5a5a]">
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!editing}
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Username
            <input type="text" value={profile.username} readOnly className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-gray-50 opacity-90" />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Email
            <input type="text" value={profile.email} readOnly className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-gray-50 opacity-90" />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Phone Number
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editing}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
        </div>
      </div>

      {/* Personal Details */}
      <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Personal Details</h2>
        <div className="grid gap-4">
          <label className="block text-sm text-[#5a5a5a]">
            Age
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={!editing}
              placeholder="e.g. 25 or 18-24"
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Gender
            <input
              type="text"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={!editing}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Date of Birth
            <input
              type="text"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={!editing}
              placeholder="e.g. 1990-01-15"
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
          <label className="block text-sm text-[#5a5a5a]">
            Location / City
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!editing}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2 bg-white/90 disabled:bg-gray-50 disabled:opacity-80"
            />
          </label>
        </div>
      </div>

      {/* Wellness Profile (read-only) */}
      <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Wellness Profile</h2>
        <div className="grid gap-3 text-sm">
          <p className="text-[#5a5a5a]">
            <span className="font-medium text-[#2c2c2c]">Emotional baseline:</span>{' '}
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

      {/* Trusted Contact (read-only if exists) */}
      {profile.trusted_contact && (
        <div className="theme-card rounded-[16px] p-6 bg-white/95 border border-[#e0dce8]">
          <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Trusted Contact</h2>
          <div className="grid gap-2 text-sm">
            <p className="text-[#5a5a5a]"><span className="font-medium text-[#2c2c2c]">Name:</span> {profile.trusted_contact.name ?? '—'}</p>
            <p className="text-[#5a5a5a]"><span className="font-medium text-[#2c2c2c]">Relation:</span> {profile.trusted_contact.relation ?? '—'}</p>
            <p className="text-[#5a5a5a]"><span className="font-medium text-[#2c2c2c]">Phone:</span> {profile.trusted_contact.phone ?? '—'}</p>
            <p className="text-[#5a5a5a]"><span className="font-medium text-[#2c2c2c]">Email:</span> {profile.trusted_contact.email ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Edit / Save */}
      <div className="flex gap-3">
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="theme-btn px-4 py-2 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a0d0]"
          >
            Edit
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
              onClick={() => {
                setEditing(false)
                setFullName(profile.full_name ?? '')
                setPhone(profile.phone ?? '')
                setAge(profile.age ?? '')
                setGender(profile.gender ?? '')
                setDateOfBirth(profile.date_of_birth ?? '')
                setLocation(profile.location ?? '')
              }}
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
