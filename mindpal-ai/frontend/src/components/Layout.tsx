import { useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { startBehaviorTracker, stopBehaviorTracker, type AutoBehaviorPayload } from '../utils/behaviorTracker'
import { useOnboardingGate } from '../hooks/useOnboardingGate'

export default function Layout() {
  const { fetchApi, logout } = useAuth()
  const navigate = useNavigate()
  const lastActive = useRef(Date.now())
  const { loading: onboardingLoading } = useOnboardingGate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const onActivity = () => { lastActive.current = Date.now() }
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    const id = setInterval(() => {
      const inactiveMinutes = (Date.now() - lastActive.current) / 60000
      fetchApi('/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inactive_minutes: inactiveMinutes }),
      }).catch(() => {})
    }, 60000)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      clearInterval(id)
    }
  }, [fetchApi])

  useEffect(() => {
    const sendAuto = (payload: AutoBehaviorPayload) =>
      fetchApi('/behavior/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(() => {})
    startBehaviorTracker(sendAuto)
    return () => stopBehaviorTracker()
  }, [fetchApi])

  return (
    <div className="min-h-screen">
      <div
        className="topbar flex items-center justify-between h-14 px-4"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          height: '56px',
          background: 'rgba(255,255,255,0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="home-btn flex items-center gap-2 text-[#2c2c2c] hover:opacity-80 transition-opacity text-lg"
          aria-label="Home"
        >
          🏠 Home
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn px-3 py-1.5 text-sm font-medium text-[#2c2c2c] rounded-lg hover:bg-black/5 transition-colors"
        >
          Logout
        </button>
      </div>
      <main className="main-container">
        {onboardingLoading ? null : <Outlet />}
      </main>
    </div>
  )
}
