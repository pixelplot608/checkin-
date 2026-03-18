import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * One-time onboarding gate.
 * - Runs only when authenticated.
 * - Skips entirely on /onboarding routes.
 * - Safe on API errors (no loops, no crashes).
 */
export function useOnboardingGate() {
  const { token, fetchApi } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token || checked) return

    // Never run gate while the user is already on an onboarding route
    if (location.pathname.startsWith('/onboarding')) {
      setChecked(true)
      return
    }

    const run = async () => {
      try {
        setLoading(true)
        const res = await fetchApi('/onboarding/profile')

        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        if (!res.ok) {
          // 404 or other error – skip onboarding gate safely
          return
        }

        const prof = await res.json().catch(() => ({}))
        const personalDone = !!prof?.personal_profile_completed
        const consentDone = !!prof?.consent_given
        const questionsDone = !!prof?.questions_completed

        let nextPath: string | null = null
        if (!personalDone) {
          nextPath = '/onboarding/personal'
        } else if (!consentDone) {
          nextPath = '/onboarding/terms'
        } else if (!questionsDone) {
          nextPath = '/onboarding/questions'
        }

        if (nextPath && location.pathname !== nextPath) {
          navigate(nextPath, { replace: true })
        }
      } catch (e) {
        console.warn('Onboarding gate failed, skipping onboarding enforcement', e)
      } finally {
        setLoading(false)
        setChecked(true)
      }
    }

    run()
  }, [token, checked, fetchApi, location.pathname, navigate])

  return { loading }
}

