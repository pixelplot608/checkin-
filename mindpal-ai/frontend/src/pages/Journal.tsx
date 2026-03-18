import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

type JournalEntry = {
  id: string
  text?: string | null
  sentiment_score: number
  emotion_label?: string | null
  stress_level?: string | null
  risk_level?: string | null
  ai_insight?: string | null
  created_at?: string
}

type AnalysisSummary = {
  emotion: string
  stress: string
  risk: string
  aiInsight: string
}

export default function Journal() {
  const { fetchApi } = useAuth()
  const [text, setText] = useState('')
  const [storeEmotionOnly, setStoreEmotionOnly] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null)

  const load = async () => {
    try {
      const res = await fetchApi('/journal?limit=20')
      if (res.ok) {
        const data = await res.json().catch(() => [])
        setEntries(Array.isArray(data) ? data : [])
      }
    } catch {
      setEntries([])
    }
  }

  useEffect(() => {
    load()
  }, [fetchApi])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const res = await fetchApi('/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), store_emotion_only: storeEmotionOnly }),
    })
    if (res.ok) {
      const data: JournalEntry | null = await res.json().catch(() => null)
      if (data) {
        setAnalysis({
          emotion: data.emotion_label ?? 'neutral',
          stress: data.stress_level ?? 'unknown',
          risk: data.risk_level ?? 'unknown',
          aiInsight: data.ai_insight ?? "I'm here with you.",
        })
      } else {
        setAnalysis(null)
      }
      setSaved(true)
      setText('')
      load()
    }
  }

  return (
    <div className="space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Journal</h1>
      <p className="text-[#5a5a5a]">Write how you feel. We analyze emotion and stress gently, with privacy-first storage.</p>
      <form onSubmit={handleSubmit} className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-6 space-y-4">
        <textarea
          placeholder="How's your day? What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="theme-input w-full px-4 py-2 border border-[#e0dce8] rounded-xl min-h-[120px] text-[#2c2c2c] focus:ring-2 focus:ring-[#c4b8e0] focus:outline-none"
          rows={4}
        />
        <label className="flex items-center gap-2 text-sm text-[#5a5a5a]">
          <input
            type="checkbox"
            checked={storeEmotionOnly}
            onChange={(e) => setStoreEmotionOnly(e.target.checked)}
          />
          Only save how I feel (we won&apos;t store your words — privacy)
        </label>
        <button
          type="submit"
          disabled={!text.trim()}
          className="theme-btn px-4 py-2 bg-[#c4b8e0] text-white rounded-xl hover:bg-[#b0a0d0] disabled:opacity-50 transition-colors"
        >
          Save entry
        </button>
        {saved && <p className="text-green-600 text-sm">Saved. We&apos;ve updated your emotional snapshot from this entry.</p>}
      </form>

      {analysis && (
        <div className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-4 space-y-2">
          <h3 className="font-medium text-[#2c2c2c]">AI emotional check-in</h3>
          <p className="text-sm text-[#5a5a5a]">
            <span className="font-medium">Emotion detected:</span> {analysis.emotion}
          </p>
          <p className="text-sm text-[#5a5a5a]">
            <span className="font-medium">Stress level:</span> {analysis.stress}
          </p>
          <p className="text-sm text-[#5a5a5a]">
            <span className="font-medium">Risk level:</span> {analysis.risk}
          </p>
          <div className="text-sm text-[#2c2c2c] mt-2">
            <span className="font-medium">AI insight:</span>
            <p className="mt-1 whitespace-pre-line">{analysis.aiInsight}</p>
          </div>
        </div>
      )}

      <div className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] p-4">
        <h3 className="font-medium text-[#2c2c2c] mb-2">Recent entries</h3>
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="text-sm border-b border-[#e0dce8] pb-2">
              {e.text != null && e.text !== '' ? (
                <p className="text-[#2c2c2c]">
                  {e.text.slice(0, 150)}
                  {e.text.length > 150 ? '…' : ''}
                </p>
              ) : (
                <p className="text-[#5a5a5a] italic">Mood: {e.emotion_label ?? 'neutral'}</p>
              )}
              <span className="text-[#8a8a8a]">
                Score: {((e.sentiment_score + 1) * 50).toFixed(0)}%
              </span>
              {e.stress_level && (
                <span className="text-[#8a8a8a] ml-2">Stress: {e.stress_level}</span>
              )}
              {e.risk_level && (
                <span className="text-[#8a8a8a] ml-2">Risk: {e.risk_level}</span>
              )}
              <span className="text-[#8a8a8a] ml-2">{e.created_at?.slice(0, 16)}</span>
            </li>
          ))}
          {entries.length === 0 && <li className="text-[#5a5a5a]">No entries yet.</li>}
        </ul>
      </div>
    </div>
  )
}
