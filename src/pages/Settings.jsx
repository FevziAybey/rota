import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Settings() {
  const { user, updateProfile, logout } = useAuth()
  const { data, stats, updateSettings, exportData, importData } = useApp()
  const { push } = useToast()
  const fileRef = useRef(null)
  const [name, setName] = useState(user?.name || '')
  const [dailyTarget, setDailyTarget] = useState(data.settings?.dailyTarget || 30)
  const [dailyWordsTarget, setDailyWordsTarget] = useState(
    data.settings?.dailyWordsTarget || 15,
  )
  const [monthlyReport, setMonthlyReport] = useState(
    data.settings?.monthlyReport !== false,
  )
  const [emailReminder, setEmailReminder] = useState(
    Boolean(data.settings?.emailReminder),
  )
  const [studyReminder, setStudyReminder] = useState(
    data.settings?.studyReminder || '',
  )
  const [busy, setBusy] = useState(false)
  const [reportPreview, setReportPreview] = useState(null)
  const [pushState, setPushState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  const [installHint, setInstallHint] = useState('')

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

  useEffect(() => {
    setDailyTarget(data.settings?.dailyTarget || 30)
    setDailyWordsTarget(data.settings?.dailyWordsTarget || 15)
    setMonthlyReport(data.settings?.monthlyReport !== false)
    setEmailReminder(Boolean(data.settings?.emailReminder))
    setStudyReminder(data.settings?.studyReminder || '')
  }, [
    data.settings?.dailyTarget,
    data.settings?.dailyWordsTarget,
    data.settings?.monthlyReport,
    data.settings?.emailReminder,
    data.settings?.studyReminder,
  ])

  useEffect(() => {
    const deferred = (e) => {
      e.preventDefault()
      window.__rotaInstall = e
      setInstallHint('Ana ekrana eklenebilir')
    }
    window.addEventListener('beforeinstallprompt', deferred)
    return () => window.removeEventListener('beforeinstallprompt', deferred)
  }, [])

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateProfile({ name })
      push('Profil güncellendi')
    } catch (err) {
      push(err.message || 'Profil güncellenemedi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveTarget = (e) => {
    e.preventDefault()
    updateSettings({
      dailyTarget: Number(dailyTarget) || 30,
      dailyWordsTarget: Number(dailyWordsTarget) || 15,
      monthlyReport,
      emailReminder,
      studyReminder,
    })
  }

  const enablePush = async () => {
    if (typeof Notification === 'undefined') {
      push('Bu tarayıcı bildirim desteklemiyor', 'error')
      return
    }
    const perm = await Notification.requestPermission()
    setPushState(perm)
    if (perm === 'granted') {
      new Notification('Rota', {
        body: studyReminder || 'Bugün kısa bir çalışma için hazır mısın?',
        icon: '/favicon.svg',
      })
      push('Tarayıcı bildirimleri açıldı')
    } else {
      push('Bildirim izni verilmedi', 'error')
    }
  }

  const sendReminder = async () => {
    setBusy(true)
    try {
      await api.sendReminderEmail()
      push('Hatırlatma e-postası gönderildi')
    } catch (err) {
      push(err.message || 'E-posta gönderilemedi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const installPwa = async () => {
    const prompt = window.__rotaInstall
    if (!prompt) {
      push('Tarayıcı menüsünden “Ana ekrana ekle”yi kullan')
      return
    }
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === 'accepted') push('Rota ana ekrana eklendi')
    window.__rotaInstall = null
    setInstallHint('')
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!window.confirm('Mevcut verilerin üzerine yazılacak. Devam?')) return
      importData(json)
    } catch {
      push('Geçersiz yedek dosyası', 'error')
    } finally {
      e.target.value = ''
    }
  }

  const loadPreview = async () => {
    try {
      const res = await api.previousMonthReport()
      setReportPreview(res)
      push('Geçen ay raporu hazır')
    } catch (err) {
      push(err.message || 'Rapor alınamadı', 'error')
    }
  }

  const sendTest = async () => {
    setBusy(true)
    try {
      const res = await api.sendTestReport()
      push(`Test maili gönderildi: ${res.to}`)
    } catch (err) {
      push(err.message || 'Mail gönderilemedi', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ayarlar</h1>
        <p>Profil, günlük görev, hatırlatmalar, PWA ve yedekler.</p>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Profil</h2>
          <form className="form" onSubmit={saveProfile}>
            <div className="field">
              <label htmlFor="name">Görünen ad</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>E-posta</label>
              <input value={user?.email || ''} disabled />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Kaydediliyor...' : 'Profili kaydet'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Hedef & hatırlatma</h2>
          <form className="form" onSubmit={saveTarget}>
            <div className="field">
              <label htmlFor="target">Dakika / gün</label>
              <input
                id="target"
                type="number"
                min="5"
                max="300"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="words-target">Kelime / gün</label>
              <input
                id="words-target"
                type="number"
                min="5"
                max="100"
                value={dailyWordsTarget}
                onChange={(e) => setDailyWordsTarget(e.target.value)}
              />
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={monthlyReport}
                onChange={(e) => setMonthlyReport(e.target.checked)}
              />
              <span>
                Her ayın 1’inde geçen ayın ilerleme raporunu e-postama gönder
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={emailReminder}
                onChange={(e) => setEmailReminder(e.target.checked)}
              />
              <span>E-posta çalışma hatırlatması tercihini kaydet</span>
            </label>
            <div className="field">
              <label htmlFor="reminder">Hatırlatma metni</label>
              <input
                id="reminder"
                placeholder="Örn. Her akşam 20 dk kelime çalış"
                value={studyReminder}
                onChange={(e) => setStudyReminder(e.target.value)}
              />
            </div>
            <p className="item-meta">
              Bugün {stats.todayMinutes} dk · {stats.questWords} kelime · hedef{' '}
              {stats.dailyTarget} dk / {stats.dailyWordsTarget} kelime
            </p>
            <button className="btn" type="submit">
              Ayarları kaydet
            </button>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Bildirimler</h2>
        <p className="item-meta" style={{ marginBottom: '1rem' }}>
          Tarayıcı bildirimi veya SMTP ile e-posta hatırlatması. Durum:{' '}
          {pushState === 'unsupported' ? 'desteklenmiyor' : pushState}
        </p>
        <div className="quick-row">
          <button className="btn" type="button" onClick={enablePush}>
            Tarayıcı bildirimi aç
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={sendReminder}
          >
            Şimdi e-posta hatırlat
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Mobil / PWA</h2>
        <p className="item-meta" style={{ marginBottom: '1rem' }}>
          Ana ekrana ekle; çevrimdışı önbellekte defter ve son veriler kalır.
          {installHint ? ` ${installHint}.` : ''}
        </p>
        <button className="btn" type="button" onClick={installPwa}>
          Ana ekrana ekle
        </button>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Aylık e-posta raporu</h2>
        <p className="item-meta" style={{ marginBottom: '1rem' }}>
          Otomatik gönderim her ayın 1’inde çalışır. SMTP ayarları sunucuda olmalı.
        </p>
        <div className="quick-row">
          <button className="btn ghost" type="button" onClick={loadPreview}>
            Geçen ayı önizle
          </button>
          <button className="btn" type="button" disabled={busy} onClick={sendTest}>
            Test maili gönder
          </button>
        </div>
        {reportPreview && (
          <pre className="report-preview">{reportPreview.text}</pre>
        )}
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Veri yedeği</h2>
        <p className="item-meta" style={{ marginBottom: '1rem' }}>
          {data.studySessions.length} seans · {data.vocabulary.length} kelime ·{' '}
          {data.goals.length} hedef · {data.notes.length} not ·{' '}
          {(data.files || []).length} dosya
        </p>
        <div className="quick-row">
          <button className="btn" type="button" onClick={exportData}>
            JSON indir
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            JSON yükle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImport}
          />
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Oturum</h2>
        <button className="btn danger" type="button" onClick={logout}>
          Çıkış yap
        </button>
      </section>
    </div>
  )
}
