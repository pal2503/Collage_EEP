import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import ProfessorDashboard from './pages/ProfessorDashboard'
import StudentDashboard from './pages/StudentDashboard'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner" />Loading campus workspace…</div>
  return <Navigate to={user ? `/${user.role.toLowerCase()}` : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/professor" element={<ProtectedRoute roles={['PROFESSOR']}><ProfessorDashboard /></ProtectedRoute>} />
          <Route path="/student" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
