import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const QUESTIONS = [
  'How supported do you feel by people around you right now?',
  'How often do you feel overwhelmed by your thoughts?',
  'When you feel low, is it easy to share that with someone?',
]

const OPTIONS = ['Not really', 'Sometimes', 'Often'] as const

export default function OnboardingQuestions() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(-1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = answers.every((a) => a !== -1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!allAnswered) {
      setError('Please answer all questions. There are no right or wrong answers.')
      return
    }
    try {
      setSaving(true)
      const res = await fetchApi('/onboarding/questions-complete', { method: 'POST' })
      if (res.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) {
        setError('Could not save. Please try again.')
        return
      }
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">A quick emotional snapshot</h1>
      <p className="text-[#5a5a5a] text-sm">
        These gentle questions help CHECKIN tune how it supports you. Answer honestly — there is no scoring or
        diagnosis.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {QUESTIONS.map((q, qi) => (
          <div key={q} className="border-b border-[#e0dce8] pb-3">
            <p className="font-medium text-[#2c2c2c] mb-2">{q}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {OPTIONS.map((opt, oi) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => {
                      const next = [...prev]
                      next[qi] = oi
                      return next
                    })
                  }
                  className={`px-3 py-1.5 rounded-full border ${
                    answers[qi] === oi ? 'bg-[#c4b8e0] text-white border-[#c4b8e0]' : 'bg-white/90 text-[#2c2c2c] border-[#e0dce8]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="theme-btn mt-2 inline-flex items-center justify-center rounded-xl bg-[#c4b8e0] px-4 py-2 text-sm text-white hover:bg-[#b0a0d0] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Finish onboarding'}
        </button>
      </form>
    </div>
  )
}

