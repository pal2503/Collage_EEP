import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) { setLoading(false); return null }
    try {
      const { data } = await api.get('/auth/me/')
      setUser(data)
      return data
    } catch {
      logout()
      return null
    } finally {
      setLoading(false)
    }
  }, [logout])

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/token/', { username, password })
    localStorage.setItem('accessToken', data.access)
    localStorage.setItem('refreshToken', data.refresh)
    return refreshUser()
  }, [refreshUser])

  useEffect(() => { refreshUser() }, [refreshUser])
  useEffect(() => {
    const handleExpired = () => logout()
    window.addEventListener('erp:session-expired', handleExpired)
    return () => window.removeEventListener('erp:session-expired', handleExpired)
  }, [logout])

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
