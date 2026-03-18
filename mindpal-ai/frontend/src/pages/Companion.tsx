import { useEffect, useRef, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { AliveBot, type BotEmotion } from '../components/companion/AliveBot'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// Frontend-only emotion hint from last user message (no API/diagnosis)
function deriveEmotion(history: ChatMessage[], loading: boolean): BotEmotion {
  if (loading) return 'calm'
  const lastUser = [...history].reverse().find((m) => m.role === 'user')
  const text = (lastUser?.content ?? '').toLowerCase()
  const sad = /\b(sad|bad|down|cry|hurt|lonely|tired|anxious|worried|miss|lost|upset|scared|nervous|stressed)\b/.test(text)
  const happy = /\b(happy|good|great|love|excited|amazing|better|glad|wonderful|relieved)\b/.test(text)
  if (sad && !happy) return 'sad'
  if (happy) return 'happy'
  return 'neutral'
}

type CompanionCharacter = {
  name?: string
  personality_traits?: string[]
  conversation_style?: string
  conversation_starter?: string | null
}

const PERSONALITY_OPTIONS = ['calm', 'caring', 'playful', 'listener', 'funny', 'gentle', 'quiet', 'encouraging']
const STYLE_OPTIONS = ['short and warm', 'thoughtful and slow', 'light and playful', 'minimal and peaceful']

export default function Companion() {
  const { fetchApi } = useAuth()

  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const [companion, setCompanion] = useState<CompanionCharacter | null>(null)
  const [name, setName] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [style, setStyle] = useState(STYLE_OPTIONS[0])
  const [starter, setStarter] = useState('')
  const [savingCompanion, setSavingCompanion] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const speakingTimeoutRef = useRef<number | null>(null)

  // Load companion character + chat history
  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const res = await fetchApi('/companion-character')
        if (!res.ok) return
        const data: CompanionCharacter = await res.json()
        setCompanion(data)
        setName(data.name || 'Tom')
        setTraits(Array.isArray(data.personality_traits) ? data.personality_traits : [])
        setStyle(data.conversation_style || STYLE_OPTIONS[0])
        setStarter(data.conversation_starter || '')
      } catch {
        // ignore – companion setup is optional
      }
    }

    const loadHistory = async () => {
      try {
        const res = await fetchApi('/chat/history?limit=40')
        if (!res.ok) return
        const list = await res.json().catch(() => [])
        if (Array.isArray(list)) {
          setHistory(
            list.map((m: { role: string; content: string }) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            }))
          )
        }
      } catch {
        setHistory([])
      }
    }

    loadCharacter()
    loadHistory()
  }, [fetchApi])

  // Web Speech API setup (voice → text)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognition.onerror = () => {
      setIsListening(false)
    }
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (typeof transcript === 'string' && transcript.trim()) {
        setMessage((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()))
      }
    }

    recognitionRef.current = recognition
    setSpeechSupported(true)

    return () => {
      recognition.stop?.()
    }
  }, [])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  const toggleTrait = (t: string) => {
    setTraits((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t)
      if (prev.length >= 5) return prev
      return [...prev, t]
    })
  }

  const handleSaveCompanion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSavingCompanion(true)
    try {
      const res = await fetchApi('/companion-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          personality_traits: traits,
          conversation_style: style,
          conversation_starter: starter.trim() || null,
        }),
      })
      if (res.ok) {
        setSavedOnce(true)
        setCompanion({
          name: name.trim(),
          personality_traits: traits,
          conversation_style: style,
          conversation_starter: starter.trim() || null,
        })
      }
    } finally {
      setSavingCompanion(false)
    }
  }

  const speak = (text: string) => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return

    try {
      if (synth.speaking) {
        synth.cancel()
      }
      const utter = new SpeechSynthesisUtterance(text)
      utter.onstart = () => {
        setIsSpeaking(true)
        if (speakingTimeoutRef.current !== null) {
          window.clearTimeout(speakingTimeoutRef.current)
        }
      }
      utter.onend = () => {
        if (speakingTimeoutRef.current !== null) {
          window.clearTimeout(speakingTimeoutRef.current)
        }
        setIsSpeaking(false)
      }
      // Safety timeout in case onend doesn't fire
      speakingTimeoutRef.current = window.setTimeout(() => {
        setIsSpeaking(false)
      }, 15000)
      synth.speak(utter)
    } catch {
      setIsSpeaking(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading) return
    const userMsg = message.trim()
    setMessage('')
    setHistory((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetchApi('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg, role: 'user' }),
      })
      if (res.ok) {
        const data = await res.json()
        const reply: string = data?.content ?? ''
        if (reply) {
          setHistory((prev) => [...prev, { role: 'assistant', content: reply }])
          speak(reply)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMicClick = () => {
    if (!speechSupported || !recognitionRef.current) return
    try {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
      }
    } catch {
      setIsListening(false)
    }
  }

  const titleName = companion?.name || name || 'Tom'
  const botEmotion = useMemo(() => deriveEmotion(history, loading), [history, loading])
  const starterText =
    companion?.conversation_starter ||
    starter ||
    "Say hi or share how you feel. I'll respond with care."

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Tom avatar + chat */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#2c2c2c]">{titleName} — your gentle companion</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Calm, non-clinical support. CHECKIN listens, reflects, and suggests tiny steps. No diagnosis. No pressure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Alive companion bot */}
            <AliveBot
              emotion={botEmotion}
              isTyping={loading || isSpeaking}
              isListening={isListening}
            />

            {/* Voice controls */}
            <div className="flex-1 space-y-2">
              <p className="text-gray-700 text-sm">
                Talk with your voice or by typing. {speechSupported ? 'Your browser supports voice input.' : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={!speechSupported}
                  className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
                    isListening
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-[#c4b8e0] text-[#7c6bb8] bg-white hover:bg-[#f8f5ff]'
                  } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current" />
                  {speechSupported ? (isListening ? 'Listening… tap to stop' : 'Hold a gentle voice chat') : 'Voice not available'}
                </button>
                {isSpeaking && (
                  <span className="text-xs text-indigo-600">Speaking softly… you can interrupt by sending a new message.</span>
                )}
              </div>
            </div>
          </div>

          {/* Chat window */}
          <div className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] overflow-hidden flex flex-col max-h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && (
                <p className="text-gray-500 text-sm">
                  {starterText}
                </p>
              )}
              {history.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-mindpal-primary text-white'
                      : 'bg-[#f8f5ff] text-[#2c2c2c] border border-[#e0dce8]'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && <p className="text-gray-400 text-sm">Thinking softly…</p>}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-[#e0dce8] flex gap-2">
              <input
                type="text"
                placeholder="Type a message or use the mic…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="theme-input flex-1 px-4 py-2 border border-[#e0dce8] rounded-xl text-sm text-[#2c2c2c] focus:ring-2 focus:ring-[#c4b8e0] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-4 py-2 bg-mindpal-primary text-white rounded-lg hover:bg-mindpal-secondary disabled:opacity-50 text-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: companion setup (merged into same page) */}
        <div className="theme-card w-full lg:w-80 bg-white/95 border border-[#e0dce8] rounded-[16px] p-4 space-y-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Tune your companion</h2>
          <p className="text-xs text-gray-500">
            Name and personality live only on your device+account. This helps CHECKIN feel more like a tiny friend than an app.
          </p>
          <form onSubmit={handleSaveCompanion} className="space-y-3 text-sm">
            <label className="block">
              <span className="text-gray-700">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tom, Sky, River"
                className="mt-1 w-full px-3 py-1.5 border rounded-lg"
                maxLength={50}
              />
            </label>

            <div>
              <span className="text-gray-700">Personality (pick up to 5)</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PERSONALITY_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrait(t)}
                    className={`px-2.5 py-1 rounded-full text-xs ${
                      traits.includes(t) ? 'bg-mindpal-primary text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-gray-700">Conversation style</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border rounded-lg"
              >
                {STYLE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-gray-700">Optional first message</span>
              <input
                type="text"
                value={starter}
                onChange={(e) => setStarter(e.target.value)}
                placeholder="e.g. Hey, how are you today?"
                className="mt-1 w-full px-3 py-1.5 border rounded-lg"
              />
            </label>

            <button
              type="submit"
              disabled={savingCompanion || !name.trim()}
              className="w-full mt-1 px-3 py-2 bg-mindpal-primary text-white rounded-lg hover:bg-mindpal-secondary disabled:opacity-50"
            >
              {savingCompanion ? 'Saving…' : 'Save companion'}
            </button>
            {savedOnce && (
              <p className="text-xs text-green-600 mt-1">Saved. Your next chats will use this vibe.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
