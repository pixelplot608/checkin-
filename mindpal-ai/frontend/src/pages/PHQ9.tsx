import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PHQ9_OPTIONS = [
  'Not at all',
  'Several days',
  'More than half the days',
  'Nearly every day',
]

export default function PHQ9() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [latest, setLatest] = useState<{ total_score: number } | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchApi('/baseline/phq9-questions')
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('PHQ-9 questions API missing, skipping questions load')
          } else {
            console.warn('PHQ-9 questions API non-OK, skipping questions load')
          }
          return
        }
        const d = await res.json().catch(() => ({}))
        setQuestions(d.questions || [])
        setAnswers(new Array(d.questions?.length || 9).fill(0))
      } catch (e) {
        console.warn('PHQ-9 questions fetch failed, skipping questions load', e)
      }
    })()
  }, [fetchApi])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchApi('/baseline/phq9/latest')
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('PHQ-9 latest API missing, treating as no previous PHQ')
          } else {
            console.warn('PHQ-9 latest API non-OK, treating as no previous PHQ')
          }
          setLatest(null)
          return
        }
        const text = await res.text()
        const d = text ? JSON.parse(text) : null
        setLatest(d && typeof d === 'object' && 'total_score' in d ? { total_score: d.total_score } : null)
      } catch (e) {
        console.warn('PHQ-9 latest fetch failed, treating as no previous PHQ', e)
        setLatest(null)
      }
    })()
  }, [fetchApi, submitted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      answers: answers.map((value, question_index) => ({ question_index, value })),
    }
    const res = await fetchApi('/baseline/phq9', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setSubmitted(true)
      const d = await res.json()
      setLatest({ total_score: d.total_score })
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">PHQ-9</h1>
      <p className="text-gray-600">
        Standard questionnaire to understand how you've been feeling over the last 2 weeks. Used to create your baseline (not a diagnosis).
      </p>
      {latest && (
        <div className="theme-card bg-[#eef2ff] border border-[#e0dce8] rounded-[16px] p-4">
          <p className="font-medium">
            Your latest PHQ-9 responses are saved (score: {latest.total_score}). We use this only to tune your
            wellness support — not as a diagnosis.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-6 space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="border-b border-[#e0dce8] pb-3">
            <p className="font-medium text-gray-800 mb-2">{i + 1}. {q}</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((v) => (
                <label key={v} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === v}
                    onChange={() => {
                      const a = [...answers]
                      a[i] = v
                      setAnswers(a)
                    }}
                  />
                  <span className="text-sm">{PHQ9_OPTIONS[v]}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit"
          className="theme-btn px-4 py-2 bg-[#c4b8e0] text-white rounded-xl hover:bg-[#b0a0d0] transition-colors"
        >
          Submit PHQ-9
        </button>
      </form>
    </div>
  )
}
