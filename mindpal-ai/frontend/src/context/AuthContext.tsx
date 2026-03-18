import { createContext, useContext, useState, useCallback } from "react"

/*
IMPORTANT:
Backend runs at: http://127.0.0.1:8000
All APIs under: /api
*/
const API_BASE = "http://127.0.0.1:8000/api"

type User = { id: string; email: string; full_name?: string }

type AuthContextType = {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  fetchApi: (path: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = "mindpal_token"
const USER_KEY = "mindpal_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  )

  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem(USER_KEY)
    return u ? JSON.parse(u) : null
  })

  /* ---------------- LOGIN ---------------- */
  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data?.detail || "Login failed")
    }

    setToken(data.access_token)
    setUser(data.user)

    localStorage.setItem(STORAGE_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }, [])

  /* ---------------- SIGNUP ---------------- */
  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.detail || "Signup failed")
      }

      setToken(data.access_token)
      setUser(data.user)

      localStorage.setItem(STORAGE_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    },
    []
  )

  /* ---------------- LOGOUT ---------------- */
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  /* ---------------- AUTH FETCH ---------------- */
  const fetchApi = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
    [token]
  )

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout, fetchApi }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
