import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const BONDING_KEY = 'checkin_companion_bonding'
const IDLE_MS = 60000

export type BotEmotion = 'happy' | 'calm' | 'sad' | 'neutral'

type AliveBotProps = {
  emotion?: BotEmotion
  isTyping?: boolean
  isListening?: boolean
  onInteraction?: () => void
}

function getBonding(): number {
  if (typeof window === 'undefined') return 0
  const v = localStorage.getItem(BONDING_KEY)
  const n = parseInt(v ?? '0', 10)
  return Math.min(100, Math.max(0, isNaN(n) ? 0 : n))
}

function addBonding(delta: number) {
  if (typeof window === 'undefined') return
  const n = getBonding() + delta
  localStorage.setItem(BONDING_KEY, String(Math.min(100, Math.max(0, n))))
}

function isNight(): boolean {
  const h = new Date().getHours()
  return h >= 22 || h < 6
}

export function AliveBot({
  emotion = 'calm',
  isTyping = false,
  isListening = false,
  onInteraction,
}: AliveBotProps) {
  const [eyesClosed, setEyesClosed] = useState(false)
  const [microTilt, setMicroTilt] = useState(0)
  const [microBounce, setMicroBounce] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [bonding, setBonding] = useState(0)
  const [showHearts, setShowHearts] = useState(false)
  const [hugActive, setHugActive] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const microIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bondingSyncedRef = useRef(false)
  const prevTypingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const playChime = () => {
    try {
      const ctx = audioContextRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)()
      if (!audioContextRef.current) audioContextRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08)
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.16)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {
      // ignore if audio not supported
    }
  }
  const playHugPulse = () => {
    try {
      const ctx = audioContextRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)()
      if (!audioContextRef.current) audioContextRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {
      // ignore
    }
  }

  // Bonding: sync from localStorage, bump on open (once per session) and when bot replies
  useEffect(() => {
    if (!bondingSyncedRef.current) {
      setBonding(getBonding())
      bondingSyncedRef.current = true
      addBonding(1) // user opened companion
      setBonding(getBonding())
    }
  }, [])
  useEffect(() => {
    onInteraction?.()
  }, [onInteraction])
  const bumpBonding = (delta: number) => {
    addBonding(delta)
    setBonding(getBonding())
  }
  useEffect(() => {
    if (isTyping && !prevTypingRef.current) bumpBonding(2)
    if (!isTyping && prevTypingRef.current) playChime()
    prevTypingRef.current = isTyping
  }, [isTyping])

  // Idle / night = sleep mode
  useEffect(() => {
    const check = () => {
      const now = Date.now()
      const idle = now - lastActivityRef.current > IDLE_MS
      setIsIdle(idle || isNight())
    }
    idleCheckRef.current = setInterval(check, 5000)
    return () => {
      if (idleCheckRef.current) clearInterval(idleCheckRef.current)
    }
  }, [])
  useEffect(() => {
    lastActivityRef.current = Date.now()
  }, [isTyping, isListening, emotion])

  const isSleep = isIdle

  // Natural blink: close 150ms, open 200ms, random interval 3–6s
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 3000
      blinkTimeoutRef.current = setTimeout(() => {
        setEyesClosed(true)
        setTimeout(() => {
          setEyesClosed(false)
          setTimeout(() => scheduleBlink(), 200)
        }, 150)
      }, delay)
    }
    scheduleBlink()
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current)
    }
  }, [])

  // Micro life: every 10–20s random head tilt, micro bounce, or double blink
  useEffect(() => {
    microIntervalRef.current = setInterval(() => {
      if (isSleep) return
      const r = Math.random()
      if (r < 0.33) {
        setMicroTilt((t) => (t === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0))
        setTimeout(() => setMicroTilt(0), 600)
      } else if (r < 0.66) {
        setMicroBounce(true)
        setTimeout(() => setMicroBounce(false), 300)
      } else {
        setEyesClosed(true)
        setTimeout(() => setEyesClosed(false), 150)
        setTimeout(() => {
          setEyesClosed(true)
          setTimeout(() => setEyesClosed(false), 150)
        }, 200)
      }
    }, 10000 + Math.random() * 10000)
    return () => {
      if (microIntervalRef.current) clearInterval(microIntervalRef.current)
    }
  }, [isSleep])

  // Happy: brief hearts
  useEffect(() => {
    if (emotion !== 'happy') return
    setShowHearts(true)
    const t = setTimeout(() => setShowHearts(false), 2500)
    return () => clearTimeout(t)
  }, [emotion])

  // Sad: comfort hug once + soft pulse sound
  useEffect(() => {
    if (emotion !== 'sad') return
    setHugActive(true)
    playHugPulse()
    const t = setTimeout(() => setHugActive(false), 2200)
    return () => clearTimeout(t)
  }, [emotion])

  const bondingGlow = 0.5 + (bonding / 100) * 0.5
  const glowMultiplier = isSleep ? 0.4 : hugActive ? 1.2 : 1
  const isSad = emotion === 'sad'
  const isHappy = emotion === 'happy'

  return (
    <div className="relative inline-block cursor-pointer select-none">
      {/* Optional soft sounds — placeholder; add URLs or Web Audio for real sounds */}
      {/* <audio ref={breathingRef} src="/sounds/breathing.mp3" loop volume={0.1} /> */}

      {/* Typing indicator */}
      {isTyping && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-[#7c6bb8] whitespace-nowrap"
        >
          Bot is typing <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity }}>•••</motion.span>
        </motion.p>
      )}

      {/* Floating hearts when happy */}
      {showHearts && isHappy && (
        <div className="absolute inset-0 pointer-events-none flex justify-center items-start -mt-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0, 1, 0.8],
                y: [-8, -24, -40],
                x: (i - 1) * 12,
              }}
              transition={{ duration: 1.2, delay: i * 0.2 }}
              className="absolute text-lg"
            >
              💕
            </motion.span>
          ))}
        </div>
      )}

      {/* Glow aura — pastel gradient, breathing opacity 0.2 → 0.35 → 0.2, 4s */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: hugActive ? '140%' : '120%',
          height: hugActive ? '140%' : '120%',
          left: hugActive ? '-20%' : '-10%',
          top: hugActive ? '-20%' : '-10%',
          opacity: bondingGlow * glowMultiplier,
        }}
      >
        <motion.div
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              ${isSad ? 'rgba(180,200,255,0.4)' : isHappy ? 'rgba(255,220,200,0.4)' : 'rgba(200,200,255,0.35)'} 0%, 
              rgba(220,210,255,0.15) 50%, 
              transparent 70%)`,
          }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Main bot container: breathing float Y 0 → -6 → 0, 4–5s easeInOut infinite */}
      <motion.div
        className="relative w-40 h-40 rounded-full flex items-center justify-center"
        animate={{
          y: isSleep ? [0, -3, 0] : [0, -6, 0],
          scale: microBounce ? 1.03 : hugActive ? 1.05 : 1,
          rotate: microTilt * 4,
        }}
        transition={{
          y: {
            duration: isSleep ? 5.5 : 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          scale: { duration: 0.2 },
          rotate: { duration: 0.25 },
        }}
        whileHover={{
          y: -8,
          scale: 1.04,
          rotate: 2,
          transition: { duration: 0.2 },
        }}
        style={{
          boxShadow: isSleep
            ? '0 8px 24px rgba(100,120,180,0.15)'
            : `0 10px 32px rgba(156,140,255,${0.08 + bonding / 400})`,
        }}
      >
        {/* Body: round, soft gradient, Pixar-style */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/60"
          style={{
            background:
              isSleep
                ? 'linear-gradient(165deg, #a8b8e8 0%, #c0c8e8 50%, #b0b8e0 100%)'
                : isSad
                  ? 'linear-gradient(165deg, #b8c4e8 0%, #d0d8f0 50%, #c0cce8 100%)'
                  : isHappy
                    ? 'linear-gradient(165deg, #e8d0c0 0%, #f0e0d8 50%, #e8d8d0 100%)'
                    : 'linear-gradient(165deg, #c4b8e8 0%, #e0d8f0 50%, #d0c8e8 100%)',
            boxShadow: 'inset 0 2px 12px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.06)',
          }}
          animate={
            hugActive
              ? {
                  scale: [1, 1.08, 1.05],
                  boxShadow: [
                    'inset 0 2px 12px rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.06)',
                    'inset 0 2px 12px rgba(255,255,255,0.6), 0 8px 28px rgba(156,140,255,0.2)',
                    'inset 0 2px 12px rgba(255,255,255,0.5), 0 6px 20px rgba(156,140,255,0.12)',
                  ],
                }
              : {}
          }
          transition={hugActive ? { duration: 2, ease: 'easeOut' } : {}}
        />

        {/* Blush */}
        <div
          className="absolute bottom-[38%] left-[18%] w-5 h-2 rounded-full opacity-60"
          style={{ background: 'rgba(255,180,180,0.5)' }}
        />
        <div
          className="absolute bottom-[38%] right-[18%] w-5 h-2 rounded-full opacity-60"
          style={{ background: 'rgba(255,180,180,0.5)' }}
        />

        {/* Face container */}
        <div className="relative flex flex-col items-center justify-center w-24">
          {/* Eyes */}
          <div className="flex gap-5 mb-2">
            <motion.div
              className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: isSleep ? 'linear-gradient(180deg, #8090c0 0%, #7080b8 100%)' : '#2c2c2c',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
              }}
              animate={{
                scaleY: eyesClosed ? 0.08 : isSleep ? 0.4 : 1,
                scaleX: 1,
              }}
              transition={{
                scaleY: { duration: eyesClosed ? 0.15 : 0.2 },
              }}
            >
              {!eyesClosed && !isSleep && (
                <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-0.5 right-0.5" />
              )}
            </motion.div>
            <motion.div
              className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: isSleep ? 'linear-gradient(180deg, #8090c0 0%, #7080b8 100%)' : '#2c2c2c',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
              }}
              animate={{
                scaleY: eyesClosed ? 0.08 : isSleep ? 0.4 : 1,
                scaleX: 1,
              }}
              transition={{
                scaleY: { duration: eyesClosed ? 0.15 : 0.2 },
              }}
            >
              {!eyesClosed && !isSleep && (
                <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-0.5 right-0.5" />
              )}
            </motion.div>
          </div>

          {/* Sad: eyes slightly lowered */}
          {emotion === 'sad' && (
            <div className="absolute top-0 w-full h-2 pointer-events-none" style={{ transform: 'translateY(2px)' }} />
          )}

          {/* Mouth: talking when isTyping */}
          <motion.div
            className="w-10 h-2 rounded-full"
            style={{
              background: 'rgba(44,44,44,0.75)',
              transformOrigin: 'center',
            }}
            animate={{
              scaleY: isTyping ? [1, 1.4, 1] : 1,
              scaleX: isTyping ? 1.05 : 1,
            }}
            transition={
              isTyping
                ? { scaleY: { duration: 0.35, repeat: Infinity }, scaleX: { duration: 0.35, repeat: Infinity } }
                : {}
            }
          />
        </div>

        {/* Sleep Zzz */}
        {isSleep && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.9, 0], y: [-4, -12, -20] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="absolute -top-2 right-0 text-sm text-[#7080b8]"
          >
            zzz
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
