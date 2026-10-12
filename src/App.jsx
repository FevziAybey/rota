import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import English from './pages/English'
import Goals from './pages/Goals'
import Notes from './pages/Notes'
import Files from './pages/Files'
import Settings from './pages/Settings'
import Learn from './pages/Learn'
import Friends from './pages/Friends'

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">Rota</div>
      <p>Alanın hazırlanıyor...</p>
    </div>
  )
}

function AppRoutes() {
  const { isAuthed, booting } = useAuth()

  if (booting) return <BootScreen />

  if (!isAuthed) {
    return (
      <Routes>
        <Route index element={<Landing />} />
        <Route path="giris" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ogrenme" element={<Learn />} />
          <Route path="ingilizce" element={<English />} />
          <Route path="arkadaslar" element={<Friends />} />
          <Route path="hedefler" element={<Goals />} />
          <Route path="notlar" element={<Notes />} />
          <Route path="dosyalar" element={<Files />} />
          <Route path="ayarlar" element={<Settings />} />
        </Route>
        <Route path="giris" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
