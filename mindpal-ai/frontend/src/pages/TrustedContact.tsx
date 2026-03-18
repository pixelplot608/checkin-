/**
 * Optional trusted contact. User-controlled; used only for gentle support with consent.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function TrustedContact() {
  const { fetchApi } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [relation, setRelation] = useState('')
  const [consentToContact, setConsentToContact] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchApi('/trusted-contact')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.has_contact) {
          setName(d.name || '')
          setRelation(d.relation || '')
          setConsentToContact(d.consent_to_contact || false)
        }
      })
  }, [fetchApi])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetchApi('/trusted-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || null,
        email: email || null,
        phone: phone || null,
        relation: relation || null,
        consent_to_contact: consentToContact,
      }),
    })
    if (res.ok) setSaved(true)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-[#2c2c2c]">Optional trusted contact</h1>
      <p className="text-[#5a5a5a]">
        If you ever want extra support, we can gently suggest reaching out to someone you trust.
        This is optional and only used with your consent.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Relation e.g. friend, family (optional)"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={consentToContact}
            onChange={(e) => setConsentToContact(e.target.checked)}
          />
          <span className="text-[#5a5a5a]">I'm okay with CHECKIN suggesting I reach out to this person if I need support</span>
        </label>
        <button type="submit" className="px-4 py-2 bg-mindpal-primary text-white rounded-lg hover:bg-mindpal-secondary">
          Save
        </button>
        {saved && <p className="text-green-600 text-sm">Saved.</p>}
      </form>
    </div>
  )
}
