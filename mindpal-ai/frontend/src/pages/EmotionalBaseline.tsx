/**
 * Emotional baseline questionnaire.
 * Frontend-only 20 questions mapped into existing 5 backend dimensions.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type BaselineDimension = 'usual_mood' | 'energy' | 'sleep' | 'connection' | 'stress'

type BaselineQuestion = {
  id: string
  text: string
  section: string
  dimension: BaselineDimension
  options: { label: string; score: number }[]
}

const QUESTIONS: BaselineQuestion[] = [
  // Section 1 — Past Experiences
  {
    id: 'q1',
    section: 'Past experiences',
    dimension: 'usual_mood',
    text: 'Do some memories from the past still make you feel heavy or uncomfortable?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Yes', score: 3 },
    ],
  },
  {
    id: 'q2',
    section: 'Past experiences',
    dimension: 'usual_mood',
    text: 'When you think about your past, how do you mostly feel?',
    options: [
      { label: 'Calm', score: 0 },
      { label: 'Confused', score: 2 },
      { label: 'Sad', score: 3 },
      { label: 'I avoid thinking about it', score: 4 },
    ],
  },
  {
    id: 'q3',
    section: 'Past experiences',
    dimension: 'stress',
    text: 'Have you ever gone through something that changed you a lot?',
    options: [
      { label: 'No', score: 0 },
      { label: 'I’m not sure', score: 2 },
      { label: 'Yes', score: 3 },
    ],
  },
  {
    id: 'q4',
    section: 'Past experiences',
    dimension: 'stress',
    text: 'Do certain places, people, or situations suddenly make you feel uneasy?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Yes', score: 3 },
    ],
  },
  // Section 2 — Friendship & Social Connection
  {
    id: 'q5',
    section: 'Friendship & social connection',
    dimension: 'connection',
    text: 'Do you feel comfortable talking to friends when you are upset?',
    options: [
      { label: 'Yes', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'No', score: 3 },
    ],
  },
  {
    id: 'q6',
    section: 'Friendship & social connection',
    dimension: 'connection',
    text: 'How often do you feel lonely even when people are around?',
    options: [
      { label: 'Never', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Often', score: 4 },
    ],
  },
  {
    id: 'q7',
    section: 'Friendship & social connection',
    dimension: 'connection',
    text: 'Do you feel like you are understood by your friends?',
    options: [
      { label: 'Yes', score: 0 },
      { label: 'A little', score: 2 },
      { label: 'Not really', score: 3 },
    ],
  },
  {
    id: 'q8',
    section: 'Friendship & social connection',
    dimension: 'connection',
    text: 'Do you avoid social situations even when you are invited?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Yes', score: 3 },
    ],
  },
  // Section 3 — Family & Home Feelings
  {
    id: 'q9',
    section: 'Family & home feelings',
    dimension: 'connection',
    text: 'Do you feel safe and comfortable at home?',
    options: [
      { label: 'Yes', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'No', score: 4 },
    ],
  },
  {
    id: 'q10',
    section: 'Family & home feelings',
    dimension: 'stress',
    text: 'Do family problems affect your mood a lot?',
    options: [
      { label: 'No', score: 0 },
      { label: 'A little', score: 2 },
      { label: 'Yes', score: 3 },
    ],
  },
  {
    id: 'q11',
    section: 'Family & home feelings',
    dimension: 'connection',
    text: 'Can you freely express your feelings at home?',
    options: [
      { label: 'Yes', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'No', score: 3 },
    ],
  },
  {
    id: 'q12',
    section: 'Family & home feelings',
    dimension: 'connection',
    text: 'Do you often keep your feelings hidden from your family?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Yes', score: 3 },
    ],
  },
  // Section 4 — Behavior, Mood & Daily Life
  {
    id: 'q13',
    section: 'Behavior, mood & daily life',
    dimension: 'energy',
    text: 'How is your energy level on most days?',
    options: [
      { label: 'Good', score: 0 },
      { label: 'Okay', score: 2 },
      { label: 'Very low', score: 4 },
    ],
  },
  {
    id: 'q14',
    section: 'Behavior, mood & daily life',
    dimension: 'sleep',
    text: 'Do you feel tired even after resting or sleeping?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Yes', score: 4 },
    ],
  },
  {
    id: 'q15',
    section: 'Behavior, mood & daily life',
    dimension: 'usual_mood',
    text: 'How often do you lose interest in things you usually enjoy?',
    options: [
      { label: 'Rarely', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Often', score: 4 },
    ],
  },
  {
    id: 'q16',
    section: 'Behavior, mood & daily life',
    dimension: 'stress',
    text: 'How do you usually handle stress?',
    options: [
      { label: 'I manage it well', score: 0 },
      { label: 'I try but struggle', score: 2 },
      { label: 'I feel overwhelmed', score: 4 },
    ],
  },
  // Section 5 — Inner Feelings & Self-Expression
  {
    id: 'q17',
    section: 'Inner feelings & self-expression',
    dimension: 'usual_mood',
    text: 'Do your thoughts sometimes feel too heavy to explain?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Yes', score: 4 },
    ],
  },
  {
    id: 'q18',
    section: 'Inner feelings & self-expression',
    dimension: 'stress',
    text: 'Do you often blame yourself when things go wrong?',
    options: [
      { label: 'No', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Yes', score: 4 },
    ],
  },
  {
    id: 'q19',
    section: 'Inner feelings & self-expression',
    dimension: 'usual_mood',
    text: 'How often do you feel hopeful about the future?',
    options: [
      { label: 'Often', score: 0 },
      { label: 'Sometimes', score: 2 },
      { label: 'Rarely', score: 4 },
    ],
  },
  {
    id: 'q20',
    section: 'Inner feelings & self-expression',
    dimension: 'connection',
    text: 'Would you like this app to help you understand yourself better?',
    options: [
      { label: 'Yes', score: 0 },
      { label: 'Maybe', score: 1 },
      { label: 'Not right now', score: 3 },
    ],
  },
]

export default function EmotionalBaseline() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {}
    QUESTIONS.forEach((q) => {
      init[q.id] = null
    })
    return init
  })
  const [submitting, setSubmitting] = useState(false)

  const allAnswered = QUESTIONS.every((q) => answers[q.id] != null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allAnswered || submitting) return
    setSubmitting(true)

    // Aggregate per existing backend dimensions
    const dims: Record<BaselineDimension, number[]> = {
      usual_mood: [],
      energy: [],
      sleep: [],
      connection: [],
      stress: [],
    }
    QUESTIONS.forEach((q) => {
      const val = answers[q.id]
      if (val != null) {
        dims[q.dimension].push(val)
      }
    })

    const choices = (Object.entries(dims) as [BaselineDimension, number[]][]).map(
      ([question_id, scores]) => {
        if (!scores.length) {
          return { question_id, choice_index: 0 }
        }
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        const idx = Math.max(0, Math.min(4, Math.round(avg)))
        return { question_id, choice_index: idx }
      },
    )

    const res = await fetchApi('/emotional-baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choices }),
    })
    setSubmitting(false)
    if (res.ok) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="max-w-2xl space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Emotional baseline</h1>
      <p className="text-gray-600">
        These questions help your companion understand your starting point. There are no right or wrong answers —
        answer honestly so we can support you better over time.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="border-b border-[#e0dce8] pb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{q.section}</p>
            <p className="font-medium text-gray-800 mb-2">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, i) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    answers[q.id] === opt.score
                      ? 'bg-[#c4b8e0] text-white border-[#c4b8e0]'
                      : 'bg-white/90 text-[#2c2c2c] border-[#e0dce8] hover:bg-[#f8f5ff]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={!allAnswered || submitting}
          className="theme-btn px-4 py-2 bg-[#c4b8e0] text-white rounded-xl hover:bg-[#b0a0d0] disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving…' : 'Save baseline and continue'}
        </button>
      </form>
    </div>
  )
}
