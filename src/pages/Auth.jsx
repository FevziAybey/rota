import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { isAuthed, login, register } = useAuth()
  const [params, setParams] = useSearchParams()
  const mode = useMemo(() => {
    const m = params.get('mod')
    return m === 'kayit' || m === 'register' ? 'register' : 'login'
  }, [params])
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthed) return <Navigate to="/" replace />

  const setMode = (next) => {
    setError('')
    setParams(next === 'register' ? { mod: 'kayit' } : {}, { replace: true })
  }

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
        })
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-glow" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" className="auth-back">
            ← Ana sayfa
          </Link>
          <p className="eyebrow">kişisel alan</p>
          <h1>Rota</h1>
          <p className="auth-lead">
            {mode === 'register'
              ? 'Hesabını oluştur; İngilizce ilerlemen, hedeflerin ve dosyaların burada kalsın.'
              : 'İngilizce ilerlemeni, hedeflerini ve notlarını kendi hesabında sakla.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Giriş
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Hesap oluştur
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Adın</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Nasıl hitap edelim?"
                value={form.name}
                onChange={onChange}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@mail.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="En az 6 karakter"
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy
              ? 'Bekle...'
              : mode === 'login'
                ? 'Giriş yap'
                : 'Hesabımı oluştur'}
          </button>
        </form>
      </div>
    </div>
  )
}
