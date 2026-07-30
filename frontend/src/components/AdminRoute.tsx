import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, roleLoaded } = useAuth()
  if (!roleLoaded) {
    // Still resolving /auth/me (e.g. right after a hard refresh) — don't redirect
    // a real admin away before we actually know their role.
    return null
  }
  if (!isAdmin) {
    return <Navigate to="/students" replace />
  }
  return <>{children}</>
}
