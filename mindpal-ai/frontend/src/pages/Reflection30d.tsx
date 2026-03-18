/**
 * 30-day reflection: choice-based. Compare with baseline. Non-clinical.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type Question = { id: string; text: string; choices: string[] }

export default function Reflection30d() {
  const { fetchApi } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [compare, setCompare] = useState<{ message: string; baseline_tendency?: string; reflection_tendency?: string } | null>(null)

  useEffect(() => {
    fetchApi('/reflection-30d/questions')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.questions?.length) {
          setQuestions(d.questions)
          const init: Record<string, number> = {}
          d.questions.forEach((q: Question) => { init[q.id] = 0 })
          setChoices(init)
        }
      })
  }, [fetchApi])

  const loadCompare = () => {
    fetchApi('/reflection-30d/compare')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCompare(d))
  }

  useEffect(() => {
    loadCompare()
  }, [fetchApi, submitted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      choices: Object.entries(choices).map(([question_id, choice_index]) => ({ question_id, choice_index })),
    }
    const res = await fetchApi('/reflection-30d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setSubmitted(true)
      loadCompare()
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">30-day reflection</h1>
      <p className="text-[#5a5a5a]">
        Same simple choices as when you started. No test — just a gentle way to see how things have shifted.
      </p>

      {compare?.message && (
        <div className="theme-card p-4 rounded-[16px] bg-[#f8f5ff] border border-[#e0dce8]">
          <p className="text-[#2c2c2c]">{compare.message}</p>
        </div>
      )}

      {submitted ? (
        <p className="text-green-600">Thanks. Your reflection is saved. You can do another anytime.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border-b border-[#e0dce8] pb-3">
              <p className="font-medium text-[#2c2c2c] mb-2">{q.text}</p>
              <div className="flex flex-wrap gap-2">
                {q.choices.map((opt, i) => (
                  <label key={i} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={q.id}
                      checked={choices[q.id] === i}
                      onChange={() => setChoices((c) => ({ ...c, [q.id]: i }))}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="px-4 py-2 bg-mindpal-primary text-white rounded-lg hover:bg-mindpal-secondary">
            Save reflection
          </button>
        </form>
      )}
    </div>
  )
}
