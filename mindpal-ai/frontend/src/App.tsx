import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import MoodTracker from './pages/MoodTracker'
import MoodForest from './pages/MoodForest'
import Journal from './pages/Journal'
import Games from './pages/Games'
import Companion from './pages/Companion'
import Behavior from './pages/Behavior'
import Healing from './pages/Healing'
import PHQ9 from './pages/PHQ9'
import TrustedContact from './pages/TrustedContact'
import EmotionalBaseline from './pages/EmotionalBaseline'
import SnapCamera from './pages/SnapCamera'
import Reflection30d from './pages/Reflection30d'
import Support from './pages/Support'
import OnboardingPersonal from './pages/OnboardingPersonal'
import OnboardingConsent from './pages/OnboardingConsent'
import OnboardingQuestions from './pages/OnboardingQuestions'
import PersonalInfo from './pages/PersonalInfo'
import Profile from './pages/Profile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { token, fetchApi } = useAuth()
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [baselineChecked, setBaselineChecked] = useState(false)
  const [hasBaseline, setHasBaseline] = useState<boolean | null>(null)
  const [hasPhq, setHasPhq] = useState<boolean | null>(null)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'CHECKIN'
  }, [])

  useEffect(() => {
    // Existing consent / baseline behaviour (risk engine) left unchanged
    const checkConsentAndBaseline = async () => {
      try {
        const res = await fetchApi('/consent')
        const data = await res.json().catch(() => ({}))
        if (!data.accepted) {
          setShowPrivacyModal(true)
          return
        }
        // Consent already accepted: check baseline and PHQ-9
        try {
          const bRes = await fetchApi('/emotional-baseline/latest')
          const baseline = await bRes.json().catch(() => null)
          const hasB = !!baseline
          setHasBaseline(hasB)

          const pRes = await fetchApi('/baseline/phq9/latest')
          const phq = await pRes.json().catch(() => null)
          const hasP = !!phq
          setHasPhq(hasP)
          setBaselineChecked(true)

          if (!hasB && location.pathname !== '/emotional-baseline') {
            navigate('/emotional-baseline', { replace: true })
          } else if (hasB && !hasP && location.pathname !== '/phq9') {
            navigate('/phq9', { replace: true })
          }
        } catch {
          setBaselineChecked(true)
        }
      } catch (e) {
        console.error('Consent check failed', e)
      }
    }
    if (token) checkConsentAndBaseline()
  }, [token, fetchApi, location.pathname, navigate])

  // Dedicated, one-time onboarding gate (does not touch risk engine)
  useEffect(() => {
    if (!token || onboardingChecked) return

    // Do not run guard while already on an onboarding page
    if (location.pathname.startsWith('/onboarding')) {
      setOnboardingChecked(true)
      return
    }

    const runOnboardingCheck = async () => {
      try {
        const res = await fetchApi('/onboarding/profile')
        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!res.ok) {
          // 404 or other error: skip onboarding gate safely
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
          nextPath = '/onboarding/consent'
        } else if (!questionsDone) {
          nextPath = '/onboarding/questions'
        }

        if (nextPath && location.pathname !== nextPath) {
          navigate(nextPath, { replace: true })
        }
      } catch (e) {
        console.warn('Onboarding profile check failed, skipping onboarding gate', e)
      } finally {
        setOnboardingChecked(true)
      }
    }

    runOnboardingCheck()
  }, [token, onboardingChecked, fetchApi, navigate, location.pathname])

  return (
    <>
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-w-xl w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-mindpal-dark">
                  Privacy &amp; Terms — CHECKIN
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Please take a moment to read how CHECKIN works and how we look after your data.
                </p>
              </div>
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto text-sm text-gray-700 space-y-3">
                <p>
                  1. CHECKIN is a personalized emotional wellness support application designed to help users understand
                  and reflect on their emotional well-being. It is not a replacement for professional medical care.
                </p>
                <p>
                  2. By using CHECKIN, you allow the app to process mood inputs, behavioral patterns, and interaction
                  signals only for emotional insight and app improvement.
                </p>
                <p>
                  3. Your personal data is securely stored using industry-standard protection methods and is never
                  shared publicly or sold.
                </p>
                <p>
                  4. CHECKIN may request camera access for Mood Snap emotion tracking. Images remain private and are
                  used only for internal emotional pattern understanding.
                </p>
                <p>
                  5. Camera is used only with your permission and is never used for advertising or public sharing.
                </p>
                <p>
                  6. With consent, CHECKIN may analyze behavioral patterns such as screen activity, typing rhythm (not
                  content), usage time, and rest patterns to improve emotional understanding.
                </p>
                <p>
                  7. CHECKIN never reads private messages, records screens, accesses personal files, or tracks
                  sensitive content.
                </p>
                <p>
                  8. All emotional insights are supportive and non-clinical. CHECKIN does not diagnose, treat, or
                  replace therapy or medical care.
                </p>
                <p>
                  9. If emotional distress appears high, CHECKIN may gently encourage seeking support from trusted
                  people or professionals.
                </p>
                <p>
                  10. By clicking &quot;I Understand and Accept&quot;, you acknowledge and agree to how CHECKIN works
                  and how your data is handled.
                </p>
              </div>
              <div className="px-6 py-4 flex justify-end bg-gray-50 border-t border-purple-100">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-purple-600 text-white px-5 py-2 text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 transition"
                  onClick={async () => {
                    try {
                      await fetchApi('/consent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accepted: true, consent_version: '1.0' }),
                      })
                      setShowPrivacyModal(false)
                      // After accepting consent, enforce baseline if missing
                      try {
                        const bRes = await fetchApi('/emotional-baseline/latest')
                        const baseline = await bRes.json().catch(() => null)
                        const hasB = !!baseline
                        setHasBaseline(hasB)

                        const pRes = await fetchApi('/baseline/phq9/latest')
                        const phq = await pRes.json().catch(() => null)
                        const hasP = !!phq
                        setHasPhq(hasP)
                        setBaselineChecked(true)

                        if (!hasB) {
                          navigate('/emotional-baseline', { replace: true })
                        } else if (!hasP) {
                          navigate('/phq9', { replace: true })
                        }
                      } catch (e) {
                        console.error('Baseline/PHQ check failed', e)
                      }
                    } catch (e) {
                      console.error('Consent save failed', e)
                    }
                  }}
                >
                  I Understand and Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={showPrivacyModal ? 'blur-sm pointer-events-none' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="mood" element={<MoodTracker />} />
            <Route path="mood-forest" element={<MoodForest />} />
            <Route path="snap" element={<Navigate to="/mood-forest" replace />} />
            <Route path="forest" element={<Navigate to="/mood-forest" replace />} />
            <Route path="snap/camera" element={<SnapCamera />} />
            <Route path="journal" element={<Journal />} />
            <Route path="games" element={<Games />} />
            <Route path="companion" element={<Companion />} />
            <Route path="behavior" element={<Behavior />} />
            <Route path="healing" element={<Healing />} />
            <Route path="trusted-contact" element={<TrustedContact />} />
            <Route path="emotional-baseline" element={<EmotionalBaseline />} />
            <Route path="reflection-30d" element={<Reflection30d />} />
            <Route path="support" element={<Support />} />
            <Route path="phq9" element={<PHQ9 />} />
            <Route path="onboarding/personal" element={<OnboardingPersonal />} />
            <Route path="onboarding/terms" element={<OnboardingConsent />} />
            <Route path="onboarding/questions" element={<OnboardingQuestions />} />
            <Route path="personal-info" element={<PersonalInfo />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}
