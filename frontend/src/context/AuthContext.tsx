import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest } from '../api/auth'
import { clearToken, getToken, setToken } from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  roleLoaded: boolean
  displayName: string | null
  email: string | null
  role: string | null
  isAdmin: boolean
  schoolId: number | null
  schoolName: string | null
  login: (username: string, password: string) => Promise<void>
  loginWithToken: (accessToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()))
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const me = await getCurrentUser()
      setDisplayName(me.display_name)
      setEmail(me.email)
      setRole(me.role)
      setSchoolId(me.school_id)
      setSchoolName(me.school_name)
    } catch {
      setDisplayName(null)
      setEmail(null)
      setRole(null)
      setSchoolId(null)
      setSchoolName(null)
    } finally {
      setRoleLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser()
    } else {
      setDisplayName(null)
      setEmail(null)
      setRole(null)
      setSchoolId(null)
      setSchoolName(null)
      setRoleLoaded(true)
    }
  }, [isAuthenticated, fetchCurrentUser])

  const login = useCallback(async (username: string, password: string) => {
    const { access_token } = await loginRequest({ username, password })
    setToken(access_token)
    setRoleLoaded(false)
    setIsAuthenticated(true)
  }, [])

  const loginWithToken = useCallback((accessToken: string) => {
    setToken(accessToken)
    setRoleLoaded(false)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        roleLoaded,
        displayName,
        email,
        role,
        isAdmin: role === 'admin',
        schoolId,
        schoolName,
        login,
        loginWithToken,
        logout,
      }}
    >
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
