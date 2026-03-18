/**
 * Behavior page: tracking only (sleep, active/idle, analytics, sleep chart).
 * No healing tools — those live on the Healing page.
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

type BehaviorEntry = {
  id?: string
  date: string
  sleep_hours: number
  screen_time_hours?: number
  activity_level: number
}

type Profile = {
  entries: BehaviorEntry[]
  sleep_estimate: number | null
  screen_usage_estimate: number | null
  activity_estimate: number | null
  idle_pattern: string | null
  web_tracking_active: boolean
  system_tracking_connected: boolean
  last_auto_sync: string | null
  last_system_sync: string | null
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function getLast7Days(): string[] {
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Behavior() {
  const { fetchApi } = useAuth()
  const [list, setList] = useState<BehaviorEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchApi('/behavior?limit=14').then((r) => (r.ok ? r.json() : [])),
      fetchApi('/behavior/profile').then((r) => (r.ok ? r.json() : null)),
    ]).then(([data, prof]) => {
      if (cancelled) return
      setList(Array.isArray(data) ? data : [])
      setProfile(prof && typeof prof === 'object' ? prof : null)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchApi])

  const entries = list
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const lastNightEntry = entries.find((e) => e.date === yesterdayStr)
  const lastNightSleep = lastNightEntry?.sleep_hours ?? profile?.sleep_estimate ?? entries.find((e) => (e.sleep_hours ?? 0) > 0)?.sleep_hours ?? null
  const last7Labels = getLast7Days()
  const sleepByDate = Object.fromEntries(entries.filter((e) => e.sleep_hours > 0).map((e) => [e.date, e.sleep_hours]))
  const last7Sleep = last7Labels.map((d) => sleepByDate[d] ?? 0)
  const avgSleep = last7Sleep.filter(Boolean).length ? (last7Sleep.reduce((a, b) => a + b, 0) / last7Sleep.filter(Boolean).length).toFixed(1) : null

  const screenHours = profile?.screen_usage_estimate ?? null
  const activityLevel = profile?.activity_estimate ?? null
  const idlePattern = profile?.idle_pattern ?? null

  const sleepQuality = lastNightSleep != null ? (lastNightSleep < 6 ? 'low' : lastNightSleep <= 8 ? 'ok' : 'good') : null
  const screenLevel = screenHours != null ? (screenHours < 4 ? 'low' : screenHours <= 8 ? 'ok' : 'high') : null

  const chartData = {
    labels: last7Labels.map((d) => {
      const date = new Date(d)
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Sleep (hours)',
        data: last7Sleep,
        backgroundColor: last7Labels.map((d) => (d === todayStr() ? 'rgba(156, 140, 255, 0.7)' : 'rgba(196, 184, 224, 0.5)')),
        borderColor: last7Labels.map((d) => (d === todayStr() ? 'rgba(124, 107, 184, 0.9)' : 'rgba(196, 184, 224, 0.8)')),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Sleep (last 7 days)', font: { size: 14 }, color: '#2c2c2c' },
      tooltip: { callbacks: { label: (ctx: { raw: number }) => `${ctx.raw} h` } },
    },
    scales: {
      y: {
        min: 0,
        max: 12,
        ticks: { stepSize: 2, color: '#5a5a5a' },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        ticks: { maxRotation: 45, color: '#5a5a5a', font: { size: 11 } },
        grid: { display: false },
      },
    },
  }

  if (loading) {
    return (
      <div className="space-y-6 page-soft-fade-in">
        <p className="text-[#5a5a5a]">Loading behavior data…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-soft-fade-in">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Behavior tracking</h1>
      <p className="text-[#5a5a5a] text-sm">
        A gentle look at sleep, usage, and activity. No judgment — just insight.
      </p>

      {/* Sleep tracking */}
      <div className="theme-card rounded-2xl p-5 bg-white/80 border border-[#e0dce8] shadow-sm">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-3">Sleep</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[#f8f5ff]/80 p-3 border border-[#e0dce8]">
            <p className="text-xs text-[#5a5a5a]">Last night</p>
            <p className="text-xl font-semibold text-[#5a4a98]">
              {lastNightSleep != null ? `${lastNightSleep} h` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-[#f8f5ff]/80 p-3 border border-[#e0dce8]">
            <p className="text-xs text-[#5a5a5a]">7-day average</p>
            <p className="text-xl font-semibold text-[#5a4a98]">{avgSleep != null ? `${avgSleep} h` : '—'}</p>
          </div>
          <div className="rounded-xl bg-[#f8f5ff]/80 p-3 border border-[#e0dce8] sm:col-span-1 col-span-2">
            <p className="text-xs text-[#5a5a5a]">Estimate (tracker)</p>
            <p className="text-xl font-semibold text-[#5a4a98]">
              {profile?.sleep_estimate != null ? `~${profile.sleep_estimate} h` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Active vs idle */}
      <div className="theme-card rounded-2xl p-5 bg-white/80 border border-[#e0dce8] shadow-sm">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-3">Usage & rest</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs text-[#5a5a5a] mb-1">Screen usage (approx.)</p>
            <p className="text-lg font-semibold text-[#2c2c2c]">
              {screenHours != null ? `~${screenHours} h` : '—'}
            </p>
            <div className="mt-2 h-2 rounded-full bg-[#e0dce8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#c4b8e0] transition-all duration-500"
                style={{ width: screenHours != null ? `${Math.min(100, (screenHours / 12) * 100)}%` : '0%' }}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-[#5a5a5a] mb-1">Idle pattern</p>
            <p className="text-lg font-semibold text-[#2c2c2c] capitalize">{idlePattern ?? '—'}</p>
            <div className="mt-2 h-2 rounded-full bg-[#e0dce8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#b8c4e0] transition-all duration-500"
                style={{
                  width:
                    idlePattern === 'high' ? '75%' : idlePattern === 'moderate' ? '45%' : idlePattern === 'low' ? '20%' : '0%',
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-[#5a5a5a] mt-3">
          Web tracking: {profile?.web_tracking_active ? 'Active' : 'Waiting for data'}. Last sync: {formatSyncTime(profile?.last_auto_sync ?? null)}
        </p>
      </div>

      {/* Behavior analytics summary */}
      <div className="theme-card rounded-2xl p-5 bg-white/80 border border-[#e0dce8] shadow-sm">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-3">Summary</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between items-center">
            <span className="text-[#5a5a5a]">Sleep quality</span>
            <span className="font-medium text-[#2c2c2c] capitalize">{sleepQuality ?? '—'}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-[#5a5a5a]">Screen usage level</span>
            <span className="font-medium text-[#2c2c2c] capitalize">{screenLevel ?? '—'}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-[#5a5a5a]">Activity level</span>
            <span className="font-medium text-[#2c2c2c]">{activityLevel != null ? `${activityLevel}/5` : '—'}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-[#5a5a5a]">Trend</span>
            <span className="font-medium text-[#2c2c2c]">Based on recent days</span>
          </li>
        </ul>
        <p className="text-xs text-[#5a5a5a] mt-3">Soft insights only. Not a diagnosis.</p>
      </div>

      {/* Sleep bar chart */}
      <div className="theme-card rounded-2xl p-5 bg-white/80 border border-[#e0dce8] shadow-sm">
        <div className="h-[220px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
        <p className="text-xs text-[#5a5a5a] mt-2">Today is highlighted.</p>
      </div>

      {/* Recent entries (optional, compact) */}
      {entries.filter((e) => (e.sleep_hours ?? 0) > 0 || (e.activity_level ?? 0) > 0).length > 0 && (
        <div className="theme-card rounded-2xl p-5 bg-white/70 border border-[#e0dce8]">
          <h2 className="text-lg font-semibold text-[#2c2c2c] mb-2">Recent entries</h2>
          <ul className="space-y-1 text-sm text-[#5a5a5a]">
            {entries.slice(0, 5).map((e) => (
              <li key={e.id ?? e.date}>
                {e.date}: sleep {e.sleep_hours}h, activity {e.activity_level}/5
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
