/**
 * Web activity tracking: focus, idle (5 min), visibility, session.
 * Sends to POST /api/behavior/auto every 60 seconds. Does not touch UI.
 */
const IDLE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const SEND_INTERVAL_MS = 60 * 1000 // 60 seconds

export type AutoBehaviorPayload = {
  active_minutes: number
  idle_minutes: number
  session_duration: number
  screen_active: boolean
}

let sessionStartMs: number = 0
let lastActivityMs: number = 0
let lastSendMs: number = 0
let intervalId: ReturnType<typeof setInterval> | null = null
let sendFn: ((payload: AutoBehaviorPayload) => Promise<void>) | null = null
const activityEvents = ['mousemove', 'keydown', 'keypress', 'click', 'scroll', 'touchstart']
let listenersAttached = false

function isIdle(): boolean {
  return Date.now() - lastActivityMs >= IDLE_THRESHOLD_MS
}

function isScreenActive(): boolean {
  return typeof document !== 'undefined' && !document.hidden
}

function onActivity(): void {
  lastActivityMs = Date.now()
}

function tick(): void {
  const now = Date.now()
  const elapsedMs = now - lastSendMs
  lastSendMs = now
  if (elapsedMs < 1000) return

  const idleNow = isIdle()
  const elapsedMinutes = elapsedMs / 60000
  let idleMinutes = 0
  let activeMinutes = elapsedMinutes
  if (idleNow) {
    const idleSpanMs = Math.min(elapsedMs, now - lastActivityMs)
    idleMinutes = idleSpanMs / 60000
    activeMinutes = Math.max(0, elapsedMinutes - idleMinutes)
  }

  const payload: AutoBehaviorPayload = {
    active_minutes: Math.round(activeMinutes * 10) / 10,
    idle_minutes: Math.round(idleMinutes * 10) / 10,
    session_duration: Math.round((now - sessionStartMs) / 60000 * 10) / 10,
    screen_active: isScreenActive(),
  }

  if (sendFn) {
    sendFn(payload).catch(() => {})
  }
}

function resetSession(): void {
  sessionStartMs = Date.now()
  lastActivityMs = sessionStartMs
  lastSendMs = sessionStartMs
}

/**
 * Start web behavior tracking. Call once when user is authenticated.
 * sendFn receives the payload and should POST to /api/behavior/auto.
 */
export function startBehaviorTracker(send: (payload: AutoBehaviorPayload) => Promise<void>): void {
  if (intervalId) return
  sendFn = send
  resetSession()
  if (typeof document !== 'undefined' && !listenersAttached) {
    document.addEventListener('visibilitychange', () => { lastActivityMs = Date.now() })
    activityEvents.forEach((ev) => document.addEventListener(ev, onActivity))
    listenersAttached = true
  }
  lastActivityMs = Date.now()
  lastSendMs = Date.now()
  intervalId = setInterval(tick, SEND_INTERVAL_MS)
}

/**
 * Stop tracking and clear interval. Does not remove document listeners to avoid duplicate remove.
 */
export function stopBehaviorTracker(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  sendFn = null
}
