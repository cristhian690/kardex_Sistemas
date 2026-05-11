import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/auth.service'
import { tokenStorage } from '../services/api'
import type { Usuario, LoginPayload } from '../types'

interface AuthContextType {
  user:    Usuario | null
  loading: boolean
  login:   (payload: LoginPayload) => Promise<void>
  logout:  () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setLoading(false)
      return
    }

    authService.getMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(payload: LoginPayload) {
    const { access_token } = await authService.login(payload)
    tokenStorage.set(access_token)
    const me = await authService.getMe()
    setUser(me)
  }

  function logout() {
    tokenStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}