import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { login as loginRequest } from '../api/auth'
import { clearToken, getToken, setToken } from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  loginWithToken: (accessToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()))

  const login = useCallback(async (username: string, password: string) => {
    const { access_token } = await loginRequest({ username, password })
    setToken(access_token)
    setIsAuthenticated(true)
  }, [])

  const loginWithToken = useCallback((accessToken: string) => {
    setToken(accessToken)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
