import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MOODS = ['happy', 'sad', 'stressed', 'calm', 'neutral'] as const
const COLORS = [
  { id: 'yellow', label: 'Yellow', hex: '#facc15' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'grey', label: 'Grey', hex: '#9ca3af' },
  { id: 'black', label: 'Black', hex: '#374151' },
  { id: 'green', label: 'Green', hex: '#22c55e' },
  { id: 'red', label: 'Red', hex: '#ef4444' },
] as const

export default function MoodSnap() {
  const { fetchApi } = useAuth()
  const navigate = useNavigate()
  const [streak, setStreak] = useState(0)
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)

  const loadStreak = async () => {
    try {
      const res = await fetchApi('/emotion/streak')
      if (res.ok) {
        const d = await res.json().catch(() => ({}))
        setStreak(typeof d?.streak_days === 'number' ? d.streak_days : 0)
      }
    } catch {
      setStreak(0)
    }
  }

  useEffect(() => {
    loadStreak()
  }, [fetchApi])

  const handleCaptureMoodSnap = () => {
    if (!selectedMood || !selectedColor) return
    navigate('/snap/camera', { state: { mood: selectedMood, color: selectedColor } })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mindpal-dark">Mood snap</h1>
      <p className="text-gray-600">
        Capture how you feel right now. Choose your mood and a color, then take a quick snap.
      </p>
      <div className="bg-mindpal-soft/50 border border-mindpal-primary/20 rounded-xl p-4 inline-block">
        <span className="font-medium text-mindpal-dark">Your streak: {streak} days</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <p className="text-gray-700 font-medium">How do you feel right now?</p>

        <div>
          <p className="text-sm text-gray-500 mb-2">Mood</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMood(m)}
                className={`px-4 py-2 rounded-lg border-2 capitalize transition-colors ${
                  selectedMood === m
                    ? 'border-mindpal-primary bg-mindpal-soft/40 text-mindpal-dark'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.id)}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${
                  selectedColor === c.id ? 'scale-110 ring-2 ring-mindpal-primary ring-offset-2' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
          {selectedColor && (
            <p className="text-xs text-gray-500 mt-1">
              {COLORS.find((c) => c.id === selectedColor)?.label}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCaptureMoodSnap}
          disabled={!selectedMood || !selectedColor}
          className="w-full py-3 bg-mindpal-primary text-white rounded-xl hover:bg-mindpal-secondary disabled:opacity-50 font-medium transition-colors"
        >
          Capture Mood Snap
        </button>

        {submitted && (
          <p className="text-green-600 text-sm">Snap saved. Your forest is growing.</p>
        )}
      </div>
    </div>
  )
}
