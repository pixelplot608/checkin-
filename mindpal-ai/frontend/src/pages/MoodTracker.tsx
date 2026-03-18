import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: '#7cb342' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#66bb6a' },
  { value: 'sad', label: 'Sad', emoji: '😢', color: '#5c6bc0' },
  { value: 'stressed', label: 'Stressed', emoji: '😰', color: '#ff8f00' },
] as const

const MOOD_COLORS: string[] = ['#7cb342', '#5c6bc0', '#ff8f00', '#78909c', '#e57373', '#ab47bc']

export default function MoodTracker() {
  const { fetchApi } = useAuth()
  const [mood, setMood] = useState<string>('')
  const [moodColor, setMoodColor] = useState<string>('')
  const [note, setNote] = useState('')
  const [list, setList] = useState<{ id: string; mood: string; note?: string; mood_color?: string; created_at?: string }[]>([])
  const [saved, setSaved] = useState(false)
  const currentMoodColor = mood
    ? ((MOODS.find((m) => m.value === mood)?.color ?? moodColor) || '')
    : ''

  const load = async () => {
    try {
      const res = await fetchApi('/mood?limit=20')
      if (res.ok) {
        const data = await res.json().catch(() => [])
        setList(Array.isArray(data) ? data : [])
      }
    } catch {
      setList([])
    }
  }

  useEffect(() => {
    load()
  }, [fetchApi])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mood) return
    const res = await fetchApi('/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mood,
        note: note || null,
        mood_color: moodColor || MOODS.find((m) => m.value === mood)?.color || null,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setNote('')
      load()
    }
  }

  return (
    <div
      className="space-y-6 page-soft-fade-in rounded-[16px] p-4 transition-colors"
      style={
        currentMoodColor
          ? { borderLeft: `4px solid ${currentMoodColor}`, backgroundColor: `${currentMoodColor}08` }
          : undefined
      }
    >
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Daily mood</h1>
      <form onSubmit={handleSubmit} className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-6 space-y-4">
        <p className="text-[#5a5a5a]">How are you feeling right now?</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`theme-btn px-4 py-2 rounded-xl border-2 transition-colors ${
                mood === m.value ? 'border-[#c4b8e0] bg-[#eef2ff] text-[#2c2c2c]' : 'border-[#e0dce8] bg-white/90 text-[#2c2c2c] hover:bg-[#f8f5ff]'
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-[#5a5a5a]">Optional: pick a color for today</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_COLORS.map((c: string) => (
            <button
              key={c}
              type="button"
              onClick={() => setMoodColor(c)}
              className="w-8 h-8 rounded-full border-2 border-[#e0dce8] hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <input
          type="text"
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="theme-input w-full px-4 py-2 border border-[#e0dce8] rounded-xl text-[#2c2c2c] focus:ring-2 focus:ring-[#c4b8e0] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!mood}
          className="theme-btn px-4 py-2 bg-[#c4b8e0] text-white rounded-xl hover:bg-[#b0a0d0] disabled:opacity-50 transition-colors"
        >
          Save mood
        </button>
        {saved && <p className="text-green-600 text-sm">Saved.</p>}
      </form>
      <div className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-4">
        <h3 className="font-medium text-[#2c2c2c] mb-2">Recent entries</h3>
        <ul className="space-y-1">
          {list.map((e) => (
            <li key={e.id} className="text-sm text-[#5a5a5a] flex items-center gap-2">
              {e.mood_color && (
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: e.mood_color }}
                />
              )}
              <span className="font-medium capitalize">{e.mood}</span>
              {e.note && ` — ${e.note}`}
              <span className="text-[#8a8a8a] ml-1">{e.created_at?.slice(0, 16)}</span>
            </li>
          ))}
          {list.length === 0 && <li className="text-[#5a5a5a]">No entries yet.</li>}
        </ul>
      </div>
    </div>
  )
}
