import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner" />Restoring your secure session…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role.toLowerCase()}`} replace />
  return children ?? <Outlet />
}
