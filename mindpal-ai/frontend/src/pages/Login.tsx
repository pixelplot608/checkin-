import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f6f7fb] via-[#eef2ff] to-[#f8f5ff]">
      <div className="theme-card bg-white/95 border border-[#e0dce8] rounded-[16px] shadow-xl p-8 w-full max-w-md">
        <h1 className="brand-title mb-6">CHECKIN</h1>
        <h2 className="text-lg font-medium text-[#2c2c2c] mb-4">Sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="theme-input w-full px-4 py-2 border border-[#e0dce8] rounded-xl focus:ring-2 focus:ring-[#c4b8e0] focus:outline-none text-[#2c2c2c]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="theme-input w-full px-4 py-2 border border-[#e0dce8] rounded-xl focus:ring-2 focus:ring-[#c4b8e0] focus:outline-none text-[#2c2c2c]"
            required
          />
          <button
            type="submit"
            className="theme-btn w-full py-2.5 bg-[#c4b8e0] text-white rounded-xl hover:bg-[#b0a0d0] font-medium transition-colors"
          >
            Log in
          </button>
        </form>
        <p className="mt-4 text-sm text-[#5a5a5a]">
          No account? <Link to="/signup" className="text-[#7c6bb8] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
