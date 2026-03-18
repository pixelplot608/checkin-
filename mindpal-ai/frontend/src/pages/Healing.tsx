/**
 * Healing page: calm tools (breathing, relax, kind words, sounds, yoga).
 * Do not add behavior tracking here — that lives on the Behavior page.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CALM_TIME_KEY = 'checkin_healing_calm_minutes'
const CALM_DATE_KEY = 'checkin_healing_calm_date'

function getTodayCalmMinutes(): number {
  if (typeof window === 'undefined') return 0
  const date = new Date().toDateString()
  if (localStorage.getItem(CALM_DATE_KEY) !== date) return 0
  return parseInt(localStorage.getItem(CALM_TIME_KEY) ?? '0', 10)
}

function addCalmMinutes(minutes: number) {
  if (typeof window === 'undefined') return
  const date = new Date().toDateString()
  const prev = localStorage.getItem(CALM_DATE_KEY) === date ? parseInt(localStorage.getItem(CALM_TIME_KEY) ?? '0', 10) : 0
  localStorage.setItem(CALM_DATE_KEY, date)
  localStorage.setItem(CALM_TIME_KEY, String(prev + minutes))
}

const BREATHE_PHASES = [
  { label: 'Inhale', duration: 4, scale: 1.35 },
  { label: 'Hold', duration: 2, scale: 1.35 },
  { label: 'Exhale', duration: 6, scale: 0.75 },
]

function BreathingOrb() {
  const [running, setRunning] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseProgress, setPhaseProgress] = useState(0)
  const phase = BREATHE_PHASES[phaseIndex]
  const duration = phase?.duration ?? 4

  useEffect(() => {
    if (!running || !phase) return
    const start = Date.now()
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000
      const progress = Math.min(1, elapsed / duration)
      setPhaseProgress(progress)
      if (progress >= 1) setPhaseIndex((i) => (i + 1) % BREATHE_PHASES.length)
    }
    const id = setInterval(tick, 80)
    return () => clearInterval(id)
  }, [running, phaseIndex, phase, duration])

  let currentScale = 1
  if (phase?.label === 'Inhale') currentScale = 0.85 + phaseProgress * 0.5
  else if (phase?.label === 'Hold') currentScale = 1.35
  else if (phase?.label === 'Exhale') currentScale = 1.35 - phaseProgress * 0.5

  return (
    <div className="theme-card rounded-2xl p-6 bg-white/80 border border-[#e0dce8] shadow-sm">
      <h3 className="text-lg font-semibold text-[#2c2c2c] mb-1">Breathing orb</h3>
      <p className="text-sm text-[#5a5a5a] mb-4">Follow the orb. Inhale, hold, exhale — at your own pace.</p>
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(196,184,224,0.5)), radial-gradient(circle, rgba(180,200,255,0.4) 0%, rgba(200,180,230,0.3) 100%)',
            boxShadow: '0 0 40px rgba(156,140,255,0.25), inset 0 0 20px rgba(255,255,255,0.3)',
          }}
          animate={running ? { scale: currentScale } : { scale: 1 }}
          transition={{ duration: 0.15 }}
        />
        <AnimatePresence mode="wait">
          <motion.span key={phase?.label ?? 'idle'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[#7c6bb8] font-medium">
            {running ? phase?.label ?? '—' : 'Ready'}
          </motion.span>
        </AnimatePresence>
        <button type="button" onClick={() => { setRunning((r) => !r); if (!running) { setPhaseIndex(0); setPhaseProgress(0) } }} className="px-5 py-2.5 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a4d0] transition-all">
          {running ? 'Pause' : 'Start'}
        </button>
      </div>
    </div>
  )
}

const RELAX_STEPS = ['Close your eyes', 'Relax your shoulders', 'Take a slow breath']
const RELAX_DURATION_SEC = 150

function MicroRelaxFlow({ onComplete }: { onComplete?: () => void }) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(RELAX_DURATION_SEC)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setActive(false)
          addCalmMinutes(Math.ceil(RELAX_DURATION_SEC / 60))
          onComplete?.()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active, onComplete])

  useEffect(() => {
    if (!active) return
    const stepDuration = RELAX_DURATION_SEC / RELAX_STEPS.length
    const step = Math.min(RELAX_STEPS.length - 1, Math.floor((RELAX_DURATION_SEC - secondsLeft) / stepDuration))
    setStepIndex(step)
  }, [active, secondsLeft])

  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="theme-card rounded-2xl p-6 bg-white/80 border border-[#e0dce8] shadow-sm">
      <h3 className="text-lg font-semibold text-[#2c2c2c] mb-1">Micro relax</h3>
      <p className="text-sm text-[#5a5a5a] mb-4">A short guided pause. Dim the lights if you can.</p>
      {!active ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-[#5a5a5a] text-sm">~2–3 minutes • Gentle steps</p>
          <button type="button" onClick={() => setActive(true)} className="px-5 py-2.5 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a4d0] transition-all">Begin</button>
        </div>
      ) : (
        <>
          <motion.div className="fixed inset-0 bg-black/15 z-[5] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          <motion.div className="flex flex-col items-center gap-6 py-4 relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center min-h-[4rem] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p key={stepIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="text-xl text-[#2c2c2c] font-medium">{RELAX_STEPS[stepIndex]}</motion.p>
              </AnimatePresence>
            </div>
            <div className="text-2xl font-light tabular-nums text-[#7c6bb8]">{minutes}:{secs.toString().padStart(2, '0')}</div>
            <button type="button" onClick={() => setActive(false)} className="text-sm text-[#5a5a5a] hover:text-[#2c2c2c]">End early</button>
          </motion.div>
        </>
      )}
    </div>
  )
}

const KIND_MESSAGES = ['You did your best today.', "It's okay to feel this way.", "I'm here with you.", 'Be gentle with yourself.']
const COMPANION_RESPONSES = ["I'm so glad that helped. You matter. 🌿", "That means a lot. Take your time. 💚", "Here whenever you need. You're not alone. 🌸", "Sending you a gentle hug. Rest if you need to. 🍃"]

function KindWords() {
  const [index, setIndex] = useState(0)
  const [helped, setHelped] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => { rotateRef.current = setInterval(() => setIndex((i) => (i + 1) % KIND_MESSAGES.length), 4000); return () => { if (rotateRef.current) clearInterval(rotateRef.current) } }, [])
  const handleHelped = () => { if (helped) return; setHelped(true); setShowResponse(true); if (rotateRef.current) clearInterval(rotateRef.current) }
  return (
    <div className="theme-card rounded-2xl p-6 bg-white/80 border border-[#e0dce8] shadow-sm">
      <h3 className="text-lg font-semibold text-[#2c2c2c] mb-1">Kind words</h3>
      <p className="text-sm text-[#5a5a5a] mb-4">A little reassurance when you need it.</p>
      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          <motion.p key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="text-center text-lg text-[#2c2c2c] min-h-[3rem]">{KIND_MESSAGES[index]}</motion.p>
        </AnimatePresence>
        {!showResponse ? (
          <motion.button type="button" onClick={handleHelped} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#f8f5ff] border border-[#e0dce8] text-[#7c6bb8] text-sm hover:bg-[#eef2ff] transition-all"><span>❤️</span> Helped me</motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-4 py-3 rounded-xl bg-[#f0fdf4]/80 border border-[#bbf7d0] text-[#166534] text-sm shadow-[0_0_20px_rgba(34,197,94,0.15)]">{COMPANION_RESPONSES[index % COMPANION_RESPONSES.length]}</motion.div>
        )}
      </div>
    </div>
  )
}

type SoundId = 'rain' | 'ocean' | 'wind' | 'white' | 'piano'
const SOUNDS: { id: SoundId; label: string; emoji: string }[] = [
  { id: 'rain', label: 'Rain', emoji: '🌧️' }, { id: 'ocean', label: 'Ocean', emoji: '🌊' }, { id: 'wind', label: 'Soft wind', emoji: '🍃' }, { id: 'white', label: 'White noise', emoji: '🔇' }, { id: 'piano', label: 'Soft piano', emoji: '🎹' },
]
function createWhiteNoiseNode(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = 2 * ctx.sampleRate
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}
function CalmSoundSpace() {
  const [activeId, setActiveId] = useState<SoundId | null>(null)
  const [volume, setVolume] = useState(0.3)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const stop = useCallback(() => { try { sourceRef.current?.stop(); sourceRef.current = null } catch {}; setActiveId(null) }, [])
  const play = useCallback((id: SoundId) => {
    if (activeId === id) { stop(); return }
    stop()
    try {
      const ctx = ctxRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)()
      if (!ctxRef.current) ctxRef.current = ctx
      const gain = ctx.createGain()
      gain.gain.value = volume
      gain.connect(ctx.destination)
      gainRef.current = gain
      if (id === 'white') {
        const source = createWhiteNoiseNode(ctx)
        source.connect(gain)
        source.start(0)
        sourceRef.current = source
        setActiveId(id)
      }
    } catch { setActiveId(null) }
  }, [activeId, volume, stop])
  useEffect(() => { if (!gainRef.current) return; gainRef.current.gain.value = volume }, [volume, activeId])
  return (
    <div className="theme-card rounded-2xl p-6 bg-white/80 border border-[#e0dce8] shadow-sm relative overflow-hidden">
      <motion.div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-30" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(196,184,224,0.2) 100%)' }} animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      <h3 className="text-lg font-semibold text-[#2c2c2c] mb-1 relative">Calm sound space</h3>
      <p className="text-sm text-[#5a5a5a] mb-4 relative">Ambient sounds to soften the moment.</p>
      <div className="space-y-3 relative">
        <div className="flex items-center gap-2 text-sm text-[#5a5a5a]"><span>Volume</span><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1 h-2 rounded-full appearance-none bg-[#e0dce8] accent-[#7c6bb8]" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SOUNDS.map((s) => (
            <motion.button key={s.id} type="button" onClick={() => play(s.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${activeId === s.id ? 'bg-[#eef2ff] border-[#c4b8e0] text-[#5a4a98]' : 'bg-white/60 border-[#e0dce8] text-[#2c2c2c] hover:border-[#d0cce0]'}`}>
              <span>{s.emoji}</span>{s.label}{activeId === s.id && <span className="ml-1 w-2 h-2 rounded-full bg-[#7c6bb8] animate-pulse" />}
            </motion.button>
          ))}
        </div>
        {activeId && <p className="text-xs text-[#5a5a5a]">{activeId === 'white' ? 'White noise is generated in your browser.' : 'Add your own audio URLs in code for ' + activeId + '.'}</p>}
      </div>
    </div>
  )
}

const YOGA_POSES: { id: string; label: string; instruction: string; emoji: string; duration: number }[] = [
  { id: 'neck', label: 'Neck stretch', instruction: 'Slowly tilt your head to one side. Breathe. Then the other.', emoji: '🧘', duration: 45 },
  { id: 'shoulder', label: 'Shoulder roll', instruction: 'Roll shoulders back gently, then forward. Repeat slowly.', emoji: '💪', duration: 45 },
  { id: 'seated', label: 'Seated stretch', instruction: 'Sit tall. Reach arms up, then fold forward if comfortable.', emoji: '🙆', duration: 60 },
  { id: 'breath', label: 'Deep breathing', instruction: 'Inhale for 4, hold for 2, exhale for 6. Repeat.', emoji: '🌬️', duration: 60 },
  { id: 'relax', label: 'Relax pose', instruction: 'Rest. Let your body soften. No effort needed.', emoji: '😌', duration: 45 },
]
function GentleYoga({ onComplete }: { onComplete?: () => void }) {
  const [poseIndex, setPoseIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const pose = YOGA_POSES[poseIndex]
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startPose = () => { setRunning(true); setSecondsLeft(pose.duration) }
  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); setRunning(false); addCalmMinutes(Math.ceil(pose.duration / 60)); onComplete?.(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, secondsLeft, pose.duration, onComplete])
  const progress = pose ? 1 - secondsLeft / pose.duration : 0
  return (
    <div className="theme-card rounded-2xl p-6 bg-white/80 border border-[#e0dce8] shadow-sm">
      <h3 className="text-lg font-semibold text-[#2c2c2c] mb-1">Gentle yoga</h3>
      <p className="text-sm text-[#5a5a5a] mb-4">Short, gentle poses. No pressure.</p>
      <div className="flex flex-col items-center gap-4">
        <p className="text-4xl">{pose.emoji}</p>
        <h4 className="text-lg font-medium text-[#2c2c2c]">{pose.label}</h4>
        <p className="text-sm text-[#5a5a5a] text-center max-w-xs">{pose.instruction}</p>
        {!running ? <button type="button" onClick={startPose} className="px-5 py-2.5 rounded-xl bg-[#c4b8e0] text-white text-sm font-medium hover:bg-[#b0a4d0] transition-all">Start ({pose.duration}s)</button> : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border-4 border-[#e0dce8] flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path fill="none" stroke="#e0dce8" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <motion.path fill="none" stroke="#7c6bb8" strokeWidth="3" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - progress * 100 }} transition={{ duration: 0.3 }} />
              </svg>
            </div>
            <span className="text-lg font-light text-[#7c6bb8]">{secondsLeft}s</span>
          </div>
        )}
        <div className="flex gap-2 mt-2">
          {YOGA_POSES.map((p, i) => (
            <button key={p.id} type="button" onClick={() => { setRunning(false); setPoseIndex(i) }} className={`w-8 h-8 rounded-full text-sm ${i === poseIndex ? 'bg-[#c4b8e0] text-white' : 'bg-[#e0dce8] text-[#5a5a5a]'}`}>{i + 1}</button>
          ))}
        </div>
        {poseIndex < YOGA_POSES.length - 1 && !running && <button type="button" onClick={() => setPoseIndex((i) => i + 1)} className="text-sm text-[#7c6bb8] hover:underline">Next pose →</button>}
      </div>
    </div>
  )
}

export default function Healing() {
  const [calmMinutes, setCalmMinutes] = useState(0)
  const [sessionCompleteMessage, setSessionCompleteMessage] = useState<string | null>(null)
  const showSessionComplete = () => setSessionCompleteMessage("You took time to slow down. That matters. 🌿")
  useEffect(() => { if (!sessionCompleteMessage) return; const t = setTimeout(() => setSessionCompleteMessage(null), 5000); return () => clearTimeout(t) }, [sessionCompleteMessage])
  useEffect(() => { setCalmMinutes(getTodayCalmMinutes()); const id = setInterval(() => setCalmMinutes(getTodayCalmMinutes()), 60000); return () => clearInterval(id) }, [])

  return (
    <div className="space-y-6 page-soft-fade-in">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div className="absolute w-[400px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(196,184,224,0.4) 0%, transparent 70%)', top: '10%', left: '-10%' }} animate={{ y: [0, -15, 0], x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[300px] h-[300px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(180,200,255,0.35) 0%, transparent 70%)', bottom: '20%', right: '-5%' }} animate={{ y: [0, 12, 0], x: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center py-2">
        <p className="text-lg text-[#2c2c2c] font-medium">Let&apos;s slow down together 🌿</p>
        <p className="text-sm text-[#5a5a5a] mt-1">A calm space for your mind and body. No pressure.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center">
        <div className="theme-card rounded-2xl px-5 py-3 bg-white/75 border border-[#e0dce8] inline-flex items-center gap-2">
          <span className="text-[#7c6bb8]">☁️</span>
          <span className="text-sm text-[#2c2c2c]">Today&apos;s calm time</span>
          <span className="font-semibold text-[#5a4a98]">{calmMinutes} min</span>
        </div>
      </motion.div>
      <AnimatePresence>
        {sessionCompleteMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="theme-card rounded-2xl p-4 bg-[#f0fdf4]/90 border border-[#bbf7d0] text-center">
            <p className="text-[#166534] text-sm">{sessionCompleteMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BreathingOrb />
        <MicroRelaxFlow onComplete={showSessionComplete} />
        <KindWords />
        <CalmSoundSpace />
        <div className="sm:col-span-2 lg:col-span-3"><GentleYoga onComplete={showSessionComplete} /></div>
      </div>
    </div>
  )
}
