import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OnboardingConsent() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!checked) {
      setError('Please agree to continue.')
      return
    }
    try {
      setSaving(true)
      const res = await fetchApi('/onboarding/consent', { method: 'POST' })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) {
        setError('Could not save consent. Please try again.')
        return
      }
      navigate('/onboarding/questions', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">CHECKIN terms & understanding</h1>
      <p className="text-[#5a5a5a] text-sm">
        Before you use CHECKIN, please read and agree to these non-medical terms.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ul className="list-disc list-inside text-sm text-[#2c2c2c] space-y-2">
          <li>CHECKIN is not a medical or emergency service.</li>
          <li>
            Any safety nudges you enable are gentle check-ins with trusted people, not emergency alerts or diagnoses.
          </li>
          <li>You can change your privacy and safety preferences later in settings.</li>
        </ul>
        <label className="flex items-start gap-2 text-sm text-[#2c2c2c]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span>
            I understand CHECKIN is non-medical and agree to these terms so I can continue into the app.
          </span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="theme-btn mt-2 inline-flex items-center justify-center rounded-xl bg-[#c4b8e0] px-4 py-2 text-sm text-white hover:bg-[#b0a0d0] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Agree & continue'}
        </button>
      </form>
    </div>
  )
}

