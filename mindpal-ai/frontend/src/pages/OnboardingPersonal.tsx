import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AGE_OPTIONS = [
  { id: 'under_13', label: 'Under 13' },
  { id: '13_17', label: '13–17' },
  { id: '18_24', label: '18–24' },
  { id: '25_34', label: '25–34' },
  { id: '35_plus', label: '35+' },
] as const

export default function OnboardingPersonal() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [ageRange, setAgeRange] = useState<string>('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!ageRange) {
      setError('Please select your age range.')
      return
    }
    if (!name) {
      setError('Please share a name we can use when talking to you.')
      return
    }
    try {
      setSaving(true)
      const res = await fetchApi('/onboarding/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          age_range: ageRange,
          gender: gender || null,
          occupation: occupation || null,
        }),
      })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) {
        setError('Could not save. Please try again.')
        return
      }
      navigate('/onboarding/terms', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Welcome to CHECKIN</h1>
      <p className="text-[#5a5a5a]">
        We&apos;ll start with a few simple details so your experience can feel more personal. You can change these
        later in settings.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          <span className="text-[#2c2c2c]">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2"
          />
        </label>
        <div className="text-sm">
          <span className="text-[#2c2c2c]">Age range (required)</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAgeRange(opt.id)}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  ageRange === opt.id ? 'bg-[#c4b8e0] text-white' : 'bg-white/90 text-[#2c2c2c] border-[#e0dce8]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm">
          <span className="text-[#2c2c2c]">Gender (optional)</span>
          <input
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            placeholder="Type or leave blank"
            className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[#2c2c2c]">Occupation (optional)</span>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Student, working, caregiver…"
            className="mt-1 w-full rounded-lg border border-[#e0dce8] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !ageRange}
          className="mt-2 inline-flex items-center justify-center theme-btn rounded-xl bg-[#c4b8e0] px-4 py-2 text-sm text-white hover:bg-[#b0a0d0] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

