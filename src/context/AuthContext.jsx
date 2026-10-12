import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let alive = true

    async function boot() {
      if (!getToken()) {
        if (alive) setBooting(false)
        return
      }
      try {
        const { user: me } = await api.me()
        if (alive) setUser(me)
      } catch {
        clearToken()
        if (alive) setUser(null)
      } finally {
        if (alive) setBooting(false)
      }
    }

    boot()
    return () => {
      alive = false
    }
  }, [])

  const login = async ({ email, password }) => {
    const { token, user: next } = await api.login({ email, password })
    setToken(token)
    setUser(next)
    return next
  }

  const register = async ({ name, email, password }) => {
    const { token, user: next } = await api.register({ name, email, password })
    setToken(token)
    setUser(next)
    return next
  }

  const updateProfile = async ({ name }) => {
    const { user: next } = await api.updateProfile({ name })
    setUser(next)
    return next
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      register,
      logout,
      updateProfile,
      isAuthed: Boolean(user),
    }),
    [user, booting],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
