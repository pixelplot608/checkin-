import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useAuth } from '../context/AuthContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const moodOrder: Record<string, number> = { happy: 0, neutral: 1, stressed: 2, sad: 3 }

const QUICK_MOODS = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'sad', label: 'Sad', emoji: '😔' },
  { id: 'stressed', label: 'Stressed', emoji: '😣' },
] as const

export default function Dashboard() {
  const { fetchApi, user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<{
    risk: { level: string; score: number; factors: string[] }
    mood_graph?: { date: string; mood: string }[]
    mood_summary?: { date: string; mood: string }[]
    emotion_trend: { date: string; emotion: string }[]
    streak_days: number
    activity: { mood_logs: number; journal_entries: number; emotion_snaps: number }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dayLine, setDayLine] = useState('')
  const [selectedQuickMood, setSelectedQuickMood] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchApi('/dashboard')
        if (!cancelled) {
          if (!res.ok) setData(null)
          else {
            const j = await res.json().catch(() => ({}))
            setData(j && typeof j === 'object' ? j : {})
          }
        }
      } catch {
        if (!cancelled) setData(null)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [fetchApi])

  if (loading) return <p className="text-[#5a5a5a]">Loading dashboard...</p>
  if (!data) return <p className="text-[#5a5a5a]">Could not load dashboard.</p>

  const risk = data.risk || { level: 'low', score: 0, factors: [] }
  const moodGraph = data.mood_graph || data.mood_summary || []
  const riskBoxClass =
    risk.level === 'low'
      ? 'bg-green-100 border-green-300 text-green-800'
      : risk.level === 'medium'
        ? 'bg-amber-100 border-amber-300 text-amber-800'
        : 'bg-red-100 border-red-300 text-red-700'
  const factors = risk.factors || []
  const moodLabels = moodGraph.map((m: { date?: string }) => m.date?.slice(0, 10) || '')
  const moodValues = moodGraph.map((m: { mood?: string }) => moodOrder[m.mood ?? ''] ?? 1)
  const chartData = {
    labels: moodLabels,
    datasets: [
      {
        label: 'Mood (0 = happy, 3 = sad)',
        data: moodValues,
        borderColor: 'rgb(129, 140, 248)',
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        tension: 0.35,
        fill: true,
      },
    ],
  }

  const displayName =
    (user as any)?.full_name ||
    (user as any)?.email?.split?.('@')?.[0] ||
    'Friend'

  const handleDayLineSubmit = () => {
    const trimmed = dayLine.trim()
    if (!trimmed) return
    setDayLine('')
    // Optional: send to API or show toast here
  }

  return (
    <div className="space-y-6 page-soft-fade-in">
      {/* App name header */}
      <header className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[#2c2c2c] tracking-tight">CHECKIN</h1>
        <p className="text-sm text-[#5a5a5a] mt-1">Health • Wellness • Emotional Care</p>
      </header>
      {/* Welcome header / Mood input */}
      <div className="theme-card rounded-[16px] p-6 md:p-8 flex flex-col gap-4 bg-[#f8f5ff]/90 border border-[#e8e4f0]">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#2c2c2c]">
              Hello, {displayName} <span aria-hidden="true">🌿</span>
            </h1>
            <p className="text-sm md:text-base text-[#5a5a5a] mt-1">How do you feel today?</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-3">
          <div className="relative w-full">
            <input
              type="text"
              value={dayLine}
              onChange={(e) => setDayLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (dayLine.trim()) handleDayLineSubmit()
                }
              }}
              placeholder="Share one line about your day..."
              className="theme-input w-full rounded-2xl border border-[#e0dce8] bg-white/90 pl-5 pr-12 py-2.5 text-sm text-[#2c2c2c] placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-[#c4b8e0] transition"
              aria-label="Share one line about your day"
            />
            <button
              type="button"
              onClick={() => dayLine.trim() && handleDayLineSubmit()}
              disabled={!dayLine.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-[#c4b8e0]/90 text-white border-0 cursor-pointer transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 active:scale-95 disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#c4b8e0] focus:ring-offset-1"
              aria-label="Submit"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedQuickMood(m.id)}
                className={`mood-btn theme-btn flex items-center gap-2 px-4 py-2 text-sm ${
                  selectedQuickMood === m.id
                    ? 'bg-[#c4b8e0] text-white shadow-md'
                    : 'bg-white/90 text-[#2c2c2c] hover:bg-[#eef2ff] hover:shadow-md border border-[#e0dce8]'
                }`}
              >
                <span aria-hidden="true">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forest hero card */}
      <div className="theme-card rounded-[16px] p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center bg-gradient-to-r from-[#f8f5ff] via-[#eef2ff] to-[#f3f8f6]">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-[#2c2c2c]">
              Your Forest <span aria-hidden="true">🌳</span>
            </h2>
            <span className="text-xs md:text-sm text-[#5a5a5a]">
              Day {Math.max(0, data.streak_days ?? 0)}
            </span>
          </div>
          <p className="text-sm text-[#5a5a5a]">Every day you show up, your forest grows.</p>
          <div className="mt-3 flex gap-3">
            {['#a34b4f', '#4ba3a6', '#e0a050', '#b28edb'].map((c) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full shadow-sm"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 md:mt-0 flex items-center md:items-end justify-end">
          <Link
            to="/mood-forest"
            className="theme-btn inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium"
          >
            <span aria-hidden="true" className="mr-2">
              📷
            </span>
            Open forest
          </Link>
        </div>
      </div>

      {/* Wellness / Streak / Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`theme-card rounded-[16px] p-4 ${riskBoxClass}`}>
          <h3 className="font-medium text-[#2c2c2c]">Wellness risk</h3>
          <p className="text-2xl font-bold capitalize">{risk.level}</p>
          <p className="text-sm opacity-80">Score: {((risk.score ?? 0) * 100).toFixed(0)}%</p>
          {factors.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">Factors: {factors.join(', ')}</p>
          )}
        </div>
        <div className="theme-card rounded-[16px] p-4 bg-white/95 border border-[#e0dce8]">
          <h3 className="font-medium text-[#2c2c2c]">Mood snap streak</h3>
          <p className="text-2xl font-bold text-indigo-600">{data.streak_days ?? 0} days</p>
          <p className="text-sm text-[#5a5a5a]">Every day counts, even small ones.</p>
        </div>
        <div className="theme-card rounded-[16px] p-4 bg-white/95 border border-[#e0dce8]">
          <h3 className="font-medium text-[#2c2c2c]">Activity</h3>
          <p className="text-sm text-[#5a5a5a]">Mood logs: {data.activity?.mood_logs ?? 0}</p>
          <p className="text-sm text-[#5a5a5a]">Journal: {data.activity?.journal_entries ?? 0}</p>
          <p className="text-sm text-[#5a5a5a]">Emotion snaps: {data.activity?.emotion_snaps ?? 0}</p>
        </div>
      </div>

      <div className="theme-card rounded-[16px] p-4 bg-white/95 border border-[#e0dce8]">
        <h3 className="font-medium text-[#2c2c2c] mb-2">Mood over time</h3>
        {chartData.labels.length > 0 ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              scales: {
                y: {
                  min: 0,
                  max: 3,
                  ticks: { stepSize: 1 },
                },
              },
              plugins: { legend: { display: false } },
            }}
          />
        ) : (
          <p className="text-[#5a5a5a]">Log some moods to see your trend.</p>
        )}
      </div>

      {/* Explore — navigation cards only */}
      <div className="section mt-8">
        <h2 className="text-lg font-semibold mb-3 text-[#2c2c2c]">
          Explore 🌿
        </h2>
        <div className="explore-grid">
          <NavCard title="Mood" emoji="🌙" onClick={() => navigate("/mood")} />
          <NavCard title="Forest" emoji="🌳" onClick={() => navigate("/mood-forest")} />
          <NavCard title="Journal" emoji="📓" onClick={() => navigate("/journal")} />
          <NavCard title="Healing" emoji="🌿" onClick={() => navigate("/healing")} />
          <NavCard title="Games" emoji="🎮" onClick={() => navigate("/games")} />
          <NavCard title="Companion" emoji="🧠" onClick={() => navigate("/companion")} />
          <NavCard title="Behavior" emoji="📊" onClick={() => navigate("/behavior")} />
          <NavCard title="Personal Info" emoji="👤" onClick={() => navigate("/profile")} />
          <NavCard title="Trusted Contact" emoji="📞" onClick={() => navigate("/trusted-contact")} />
          <NavCard title="Support" emoji="🆘" onClick={() => navigate("/support")} />
          <NavCard title="Test" emoji="🔁" onClick={() => navigate("/reflection-30d")} />
        </div>
      </div>
    </div>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function NavCard({ title, emoji, onClick }: { title: string; emoji: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="explore-card theme-card cursor-pointer rounded-[14px] border border-[#e0dce8] bg-white/95 active:scale-[0.98] hover:border-[#d0cce0]"
    >
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-sm font-medium text-[#2c2c2c]">{title}</div>
    </div>
  );
}
