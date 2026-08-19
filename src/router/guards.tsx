import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingPage } from '@/components/common/Loading'

// Requires authentication
export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth()
  const location = useLocation()

  if (!isInitialized) return <LoadingPage />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

// Requires admin or operator role
export function AdminRoute() {
  const { isAuthenticated, isOperator, isInitialized } = useAuth()
  const location = useLocation()

  if (!isInitialized) return <LoadingPage />

  if (!isAuthenticated) {
    return <Navigate to="/login?admin=true" state={{ from: location }} replace />
  }

  if (!isOperator) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

// Redirect authenticated users away from auth pages
export function GuestRoute() {
  const { isAuthenticated, isInitialized } = useAuth()

  if (!isInitialized) return <LoadingPage />

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
