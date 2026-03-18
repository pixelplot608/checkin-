/**
 * Privacy & consent. Non-medical, calm wording.
 * Shown after signup or when consent not yet given.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Consent() {
  const { fetchApi } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchApi('/consent')
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('Consent API missing on Consent page, treating as not accepted')
          } else {
            console.warn('Consent API non-OK on Consent page, treating as not accepted')
          }
          if (!cancelled) setAccepted(false)
          return
        }
        const d = await res.json().catch(() => ({}))
        if (!cancelled) setAccepted(!!d.accepted)
      } catch (e) {
        console.warn('Consent fetch failed on Consent page, treating as not accepted', e)
        if (!cancelled) setAccepted(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchApi])

  const handleAccept = async () => {
    setSaving(true)
    try {
      const res = await fetchApi('/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true, consent_version: '1.0' }),
      })
      if (res.ok) {
        setAccepted(true)
        navigate('/')
      } else if (res.status === 404) {
        console.warn('Consent POST API missing on Consent page, staying on page')
      } else {
        console.warn('Consent POST API non-OK on Consent page, staying on page')
      }
    } catch (e) {
      console.warn('Consent save failed on Consent page, staying on page', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-mindpal-dark">Privacy & your data</h1>
      <p className="text-gray-600">
        We use your inputs only to offer you a calmer, more supportive experience. We don&apos;t diagnose,
        and we don&apos;t use medical language. You can skip sharing anything you&apos;re not comfortable with.
      </p>
      <ul className="list-disc list-inside text-gray-600 space-y-1">
        <li>Mood and journal entries are used only to adapt your companion and insights.</li>
        <li>We don&apos;t store raw journal text long-term; we keep only emotion-related scores.</li>
        <li>You can delete your data or stop anytime.</li>
      </ul>
      {accepted ? (
        <p className="text-green-600">You&apos;ve already accepted. You can continue using CHECKIN.</p>
      ) : (
        <button
          onClick={handleAccept}
          disabled={saving}
          className="px-4 py-2 bg-mindpal-primary text-white rounded-lg hover:bg-mindpal-secondary disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'I understand and accept'}
        </button>
      )}
    </div>
  )
}
