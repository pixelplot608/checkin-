/**
 * Forest: living, real-time growing forest with smooth animations.
 * One tree per daily snap. Seed → sapling → tree growth, floating leaves, streak glow.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

type DailySnap = {
  id: string
  user_id: string
  date: string
  day_number: number
  mood: string
  color: string
  image_url: string | null
  timestamp: string | null
}

type TreeDay = { day: string; emotion: string; mood_color?: string }
type AnimalDay = { day: string; animal_type: string }

const COLOR_TREE: Record<string, { bg: string; label: string }> = {
  yellow: { bg: 'bg-lime-300', label: 'yellow-green' },
  blue: { bg: 'bg-blue-200', label: 'blue-tinted' },
  grey: { bg: 'bg-gray-400', label: 'grey' },
  black: { bg: 'bg-gray-800', label: 'dark' },
  green: { bg: 'bg-green-500', label: 'green' },
  red: { bg: 'bg-orange-400', label: 'red-orange' },
}

const ACTIVITIES = [
  { type: 'calm_animal', label: 'Calm a friend', emoji: '🦌', message: 'You sat with the deer. A moment of calm.' },
  { type: 'water_plant', label: 'Water a plant', emoji: '🌱', message: 'The plant is grateful. Small care matters.' },
  { type: 'simple_puzzle', label: 'Peaceful puzzle', emoji: '🧩', message: 'You took your time. No rush, no score.' },
] as const

// Deterministic position from index for stable layout
function treePosition(i: number, total: number): { left: string; bottom: string } {
  const seed = (i + 1) * 31
  const left = 8 + (seed % 84)
  const bottom = 12 + (seed % 24)
  return { left: `${left}%`, bottom: `${bottom}%` }
}

function TreeSprite({
  snap,
  isNew,
  onCare,
}: {
  snap: DailySnap
  isNew: boolean
  onCare?: boolean
}) {
  const treeStyle = COLOR_TREE[snap.color] || { bg: 'bg-green-500', label: 'tree' }
  const size = snap.day_number >= 16 ? 44 : snap.day_number >= 8 ? 36 : 28
  const pos = treePosition(snap.day_number - 1, 50)

  return (
    <motion.div
      className="absolute flex flex-col items-center justify-end pointer-events-none"
      style={{ left: pos.left, bottom: pos.bottom, width: size + 16, height: size + 24 }}
      initial={isNew ? { scale: 0, opacity: 0.6, y: 20 } : false}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: onCare ? [0, -2, 2, -1, 0] : [0, 0.5, -0.5, 0],
      }}
      transition={
        isNew
          ? { duration: 2, ease: 'easeOut', opacity: { duration: 1.5 } }
          : { rotate: { duration: 4, repeat: Infinity, repeatType: 'reverse' } }
      }
    >
      <motion.div
        className={`rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 ${treeStyle.bg}`}
        style={{ width: size, height: size }}
        animate={isNew ? { scale: [0.3, 0.7, 1.05, 1] } : {}}
        transition={isNew ? { duration: 2, times: [0, 0.5, 0.85, 1] } : {}}
        whileHover={{ scale: 1.08, filter: 'brightness(1.1)' }}
      >
        <span className="text-white drop-shadow" style={{ fontSize: size * 0.5 }}>
          🌲
        </span>
      </motion.div>
      <span className="text-[10px] text-white/90 mt-0.5 drop-shadow-sm">{snap.date.slice(5)}</span>
    </motion.div>
  )
}

function FloatingLeaves() {
  const leaves = [
    { delay: 0, duration: 22, left: '10%' },
    { delay: 3, duration: 18, left: '25%' },
    { delay: 6, duration: 25, left: '55%' },
    { delay: 2, duration: 20, left: '75%' },
    { delay: 8, duration: 19, left: '40%' },
    { delay: 4, duration: 23, left: '88%' },
  ]
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {leaves.map((l, i) => (
        <motion.div
          key={i}
          className="absolute text-lg opacity-20"
          style={{ left: l.left, bottom: '-2rem' }}
          animate={{
            y: ['0px', '-420px'],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: l.duration,
            repeat: Infinity,
            delay: l.delay,
            ease: 'linear',
          }}
        >
          🍃
        </motion.div>
      ))}
    </div>
  )
}

function EmptySeed() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-14 h-14 rounded-full bg-amber-900/40 border-2 border-amber-800/50 flex items-center justify-center"
        animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-2xl">🌱</span>
      </motion.div>
      <p className="text-white/95 text-sm mt-4 font-medium">Plant your first mood to grow your forest 🌱</p>
    </motion.div>
  )
}

export default function Forest() {
  const { fetchApi } = useAuth()
  const [dailySnaps, setDailySnaps] = useState<DailySnap[]>([])
  const [trees, setTrees] = useState<TreeDay[]>([])
  const [animals, setAnimals] = useState<AnimalDay[]>([])
  const [streak, setStreak] = useState(0)
  const [growth, setGrowth] = useState(0)
  const [color, setColor] = useState<string>('#4CAF50')
  const [activityMessage, setActivityMessage] = useState<string | null>(null)
  const [showRipple, setShowRipple] = useState(false)
  const [careShake, setCareShake] = useState(false)
  const prevSnapCount = useRef(0)

  const loadDailySnaps = () => {
    fetchApi('/daily-snaps')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: DailySnap[]) => setDailySnaps(Array.isArray(list) ? list : []))
  }

  const loadForest = () => {
    fetchApi('/forest')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setTrees(d.trees || [])
          setAnimals(d.animals || [])
          setStreak(d.streak_days ?? 0)
          setGrowth(typeof d.growth === 'number' ? d.growth : 0)
          setColor(d.color || '#4CAF50')
        }
      })
  }

  useEffect(() => {
    loadDailySnaps()
    loadForest()
  }, [fetchApi])

  useEffect(() => {
    prevSnapCount.current = dailySnaps.length
  }, [dailySnaps.length])

  const doActivity = async (activityType: string) => {
    const res = await fetchApi('/forest/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_type: activityType }),
    })
    if (res.ok) {
      setActivityMessage(ACTIVITIES.find((a) => a.type === activityType)?.message ?? 'Done.')
      setTimeout(() => setActivityMessage(null), 3000)
      setShowRipple(true)
      setCareShake(true)
      setTimeout(() => setShowRipple(false), 1200)
      setTimeout(() => setCareShake(false), 800)
    }
  }

  const hasSnaps = dailySnaps.length > 0
  const streakGlow = Math.min(0.35, 0.12 + streak * 0.02)

  return (
    <div className="space-y-6">
      {/* Card container */}
      <div className="relative rounded-2xl overflow-hidden border border-[#e0dce8] bg-white/80 shadow-lg backdrop-blur-sm">
        {/* Streak-based glow behind forest */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 90%, rgba(100,180,120,${streakGlow}) 0%, transparent 55%)`,
          }}
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative px-5 pt-5 pb-2">
          <h1 className="text-xl font-semibold text-[#2c2c2c] flex items-center gap-2">
            <span aria-hidden="true">🌳</span> Your Forest
          </h1>
          <p className="text-sm text-[#5a5a5a] mt-1">Your forest is growing with you 🌱</p>

          {/* Streak badge with glow */}
          <motion.div
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 border border-green-200 bg-green-50/90"
            animate={{ boxShadow: streak > 0 ? ['0 0 0 rgba(74,222,128,0)', '0 0 20px rgba(74,222,128,0.25)', '0 0 0 rgba(74,222,128,0)'] : [] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-green-700 font-medium">Day {streak}</span>
            <span className="text-green-600 text-sm">{streak !== 1 ? 'days' : 'day'}</span>
          </motion.div>
        </div>

        {/* Forest ground + trees */}
        <div className="relative min-h-[200px] mx-4 mb-4 rounded-2xl overflow-hidden border border-green-300/40 bg-gradient-to-b from-green-600/95 via-green-700/90 to-green-800/95">
          <FloatingLeaves />

          {/* Water ripple (on care) */}
          <AnimatePresence>
            {showRipple && (
              <motion.div
                className="absolute inset-0 flex items-end justify-center pointer-events-none"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-blue-300/60 mb-16"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: [0, 8, 12], opacity: [0.8, 0.3, 0] }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full bg-white/20"
                  initial={{ scaleX: 0.2, opacity: 0.5 }}
                  animate={{ scaleX: [0.2, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!hasSnaps ? (
            <EmptySeed />
          ) : (
            <div className="relative w-full h-[200px]">
              {dailySnaps.map((snap, i) => (
                <TreeSprite
                  key={snap.id}
                  snap={snap}
                  isNew={i === dailySnaps.length - 1 && dailySnaps.length > prevSnapCount.current}
                  onCare={careShake}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative px-5 pb-4">
          <a href="#mood-snap" className="text-sm text-[#5a4a98] hover:underline font-medium">
            Add today&apos;s snap →
          </a>
        </div>
      </div>

      {/* Legacy tree grid from /forest - keep for backward compat */}
      {trees.length > 0 && (
        <details className="theme-card rounded-2xl border border-[#e0dce8] overflow-hidden">
          <summary className="px-4 py-3 text-[#5a5a5a] cursor-pointer text-sm">Previous mood snaps</summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 border-t border-[#e0dce8]">
            {trees.map((t, i) => (
              <div
                key={t.day}
                className="rounded-xl border border-[#e0dce8] p-3 text-center bg-white/80"
                style={{ borderLeftColor: t.mood_color || '#66bb6a', borderLeftWidth: 4 }}
              >
                <p className="text-2xl mb-1">{t.emotion === 'happy' ? '🌳' : t.emotion === 'sad' ? '🌲' : '🪵'}</p>
                <p className="text-xs text-[#5a5a5a]">{t.day.slice(5)}</p>
                {animals[i] && (
                  <p className="text-lg mt-1" title={animals[i].animal_type}>
                    {animals[i].animal_type === 'butterfly' && '🦋'}
                    {animals[i].animal_type === 'deer' && '🦌'}
                    {animals[i].animal_type === 'owl' && '🦉'}
                    {animals[i].animal_type === 'rabbit' && '🐰'}
                    {animals[i].animal_type === 'bird' && '🐦'}
                    {animals[i].animal_type === 'fox' && '🦊'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Calm activities */}
      <div className="theme-card rounded-2xl border border-[#e0dce8] p-5">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-1">Calm activities</h2>
        <p className="text-sm text-[#5a5a5a] mb-4">No scores, no pressure. Just a moment of peace.</p>
        <div className="flex flex-wrap gap-3">
          {ACTIVITIES.map((a) => (
            <motion.button
              key={a.type}
              type="button"
              onClick={() => doActivity(a.type)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 rounded-xl border border-[#e0dce8] bg-white/90 hover:bg-[#f8f5ff] transition-colors text-left flex items-center gap-2"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="font-medium text-[#2c2c2c]">{a.label}</span>
            </motion.button>
          ))}
        </div>
        <AnimatePresence>
          {activityMessage && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-green-700 text-sm"
            >
              {activityMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
