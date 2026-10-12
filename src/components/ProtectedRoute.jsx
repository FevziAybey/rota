import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthed, booting } = useAuth()

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">Rota</div>
        <p>Alanın hazırlanıyor...</p>
      </div>
    )
  }

  if (!isAuthed) return <Navigate to="/giris" replace />
  return <Outlet />
}
