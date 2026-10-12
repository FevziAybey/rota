import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const links = [
  { to: '/', label: 'Özet', short: 'Özet', end: true, icon: '⌂' },
  { to: '/ogrenme', label: 'Öğrenme', short: 'Öğren', icon: '◆' },
  { to: '/ingilizce', label: 'İngilizce', short: 'EN', icon: 'A' },
  { to: '/arkadaslar', label: 'Arkadaşlar', short: 'Ark.', icon: '◎' },
  { to: '/hedefler', label: 'Hedefler', short: 'Hedef', icon: '◇' },
  { to: '/notlar', label: 'Notlar', short: 'Not', icon: '✎' },
  { to: '/dosyalar', label: 'Dosyalar', short: 'Dosya', icon: '▤' },
  { to: '/ayarlar', label: 'Ayarlar', short: 'Ayar', icon: '⚙' },
]

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { saving, error, loading, offline } = useApp()

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">R</span>
          <div>
            <strong>Rota</strong>
            <small>ilerleme alanı</small>
          </div>
        </div>

        <nav className="side-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials(user?.name || 'U')}</div>
          <div className="user-meta">
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
          <button className="btn ghost btn-sm" type="button" onClick={logout}>
            Çıkış
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="main-top">
          <div
            className="sync-pill"
            data-state={
              error || offline ? 'error' : saving ? 'saving' : 'ok'
            }
          >
            {offline
              ? 'Çevrimdışı — son kayıt kullanılıyor'
              : error
                ? error
                : saving
                  ? 'Kaydediliyor...'
                  : loading
                    ? 'Yükleniyor...'
                    : 'Hesabına kaydedildi'}
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobil menü">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span className="mobile-nav-label">{link.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
