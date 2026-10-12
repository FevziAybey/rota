import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const BANDS = [
  { id: '1-1000', from: 1, to: 1000, label: '1–1000' },
  { id: '1001-2000', from: 1001, to: 2000, label: '1001–2000' },
  { id: '2001-3000', from: 2001, to: 3000, label: '2001–3000' },
  { id: '3001-5000', from: 3001, to: 5000, label: '3001–5000' },
  { id: '5001-7500', from: 5001, to: 7500, label: '5001–7500' },
  { id: '7501-10000', from: 7501, to: 10000, label: '7501–10000' },
]

function daySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function pickDaily(items, n, seed) {
  if (!items.length) return []
  const copy = [...items]
  let s = seed
  for (let i = copy.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export default function Dashboard() {
  const { user } = useAuth()
  const { stats, data, addSession, updateSettings } = useApp()
  const maxWeek = Math.max(30, ...stats.weekDays.map((d) => d.minutes))
  const recentGoals = data.goals.filter((g) => g.status === 'active').slice(0, 4)
  const recentWords = data.vocabulary.slice(0, 5)
  const firstName = user?.name?.split(' ')[0] || 'sen'
  const [quickMinutes, setQuickMinutes] = useState(25)
  const [dailyWords, setDailyWords] = useState([])
  const reminder = data.settings?.studyReminder?.trim()

  useEffect(() => {
    let alive = true
    api
      .wordbank({ from: 1, to: 2000, qualityOnly: '1', status: 'new', limit: 80 })
      .then((res) => {
        if (!alive) return
        const picked = pickDaily(res.items || [], 5, daySeed())
        setDailyWords(picked)
      })
      .catch(() => {
        if (alive) setDailyWords([])
      })
    return () => {
      alive = false
    }
  }, [data.wordbankProgress])

  const bandProgress = useMemo(() => {
    const progress = data.wordbankProgress || {}
    return BANDS.map((band) => {
      const size = band.to - band.from + 1
      let known = 0
      let touched = 0
      for (let r = band.from; r <= band.to; r += 1) {
        const id = `w${String(r).padStart(5, '0')}`
        const st = progress[id]
        if (!st) continue
        touched += 1
        if (st === 'known') known += 1
      }
      return {
        ...band,
        known,
        touched,
        pct: Math.round((known / size) * 100),
      }
    })
  }, [data.wordbankProgress])

  const checklist = useMemo(() => {
    const items = [
      {
        id: 'session',
        done: data.studySessions.length > 0,
        label: 'İlk çalışma seansını kaydet',
        to: '/ingilizce',
      },
      {
        id: 'word',
        done: data.vocabulary.length > 0 || stats.wordbankKnown > 0,
        label: 'Kelime defteri veya havuzdan bir kelime çalış',
        to: '/ingilizce?mod=havuz',
      },

      {
        id: 'goal',
        done: data.goals.length > 0,
        label: 'Bir hedef belirle',
        to: '/hedefler',
      },
      {
        id: 'note',
        done: data.notes.length > 0,
        label: 'Kısa bir not bırak',
        to: '/notlar',
      },
    ]
    const doneCount = items.filter((i) => i.done).length
    return { items, doneCount, allDone: doneCount === items.length }
  }, [
    data.studySessions.length,
    data.vocabulary.length,
    data.goals.length,
    data.notes.length,
    stats.wordbankKnown,
  ])


  const showOnboarding =
    !data.settings?.onboardingDismissed && !checklist.allDone

  return (
    <div className="page">
      <div className="page-head">
        <h1>Merhaba, {firstName}.</h1>
        <p>
          Bugünkü hedefin {stats.dailyTarget} dk. İlerlemen hesabına otomatik
          kaydoluyor.
        </p>
        {stats.streak > 0 ? (
          <div className="streak-badge" title="Üst üste çalıştığın gün">
            <span aria-hidden="true">◆</span>
            {stats.streak} günlük seri
          </div>
        ) : (
          <div className="streak-badge" title="Bugün çalışarak seriyi başlat">
            <span aria-hidden="true">◇</span>
            Seriyi bugün başlat
          </div>
        )}
      </div>

      {reminder && (
        <div className="reminder-banner">
          <span className="reminder-label">Hatırlatma</span>
          <p>{reminder}</p>
          <Link className="btn ghost btn-sm" to="/ayarlar">
            Düzenle
          </Link>
        </div>
      )}

      {showOnboarding && (
        <section className="panel onboarding-panel">
          <div className="panel-head">
            <h2>Başlangıç listesi</h2>
            <span className="badge">
              {checklist.doneCount}/{checklist.items.length}
            </span>
          </div>
          <p className="item-meta" style={{ marginBottom: '0.9rem' }}>
            Rotanı doldurmak için birkaç küçük adım. İstediğin zaman kapatabilirsin.
          </p>
          <div className="checklist">
            {checklist.items.map((item) => (
              <div
                className={`checklist-item ${item.done ? 'done' : ''}`}
                key={item.id}
              >
                <span className="check-mark" aria-hidden="true">
                  {item.done ? '✓' : '○'}
                </span>
                {item.done ? (
                  <span>{item.label}</span>
                ) : (
                  <Link to={item.to}>{item.label}</Link>
                )}
              </div>
            ))}
          </div>
          <button
            className="btn ghost btn-sm"
            type="button"
            style={{ marginTop: '0.9rem' }}
            onClick={() =>
              updateSettings({ onboardingDismissed: true }, { silent: true })
            }
          >
            Listeyi gizle
          </button>
        </section>
      )}

      <section className="panel daily-panel">
        <div className="panel-head">
          <h2>Günlük hedef</h2>
          <span className="badge">
            {stats.todayMinutes}/{stats.dailyTarget} dk
          </span>
        </div>
        <div className="progress big">
          <span style={{ width: `${stats.dailyProgress}%` }} />
        </div>
        <div className="quick-row">
          <div className="field compact">
            <label htmlFor="quick-min">Hızlı kayıt (dk)</label>
            <input
              id="quick-min"
              type="number"
              min="5"
              max="180"
              value={quickMinutes}
              onChange={(e) => setQuickMinutes(e.target.value)}
            />
          </div>
          <button
            className="btn"
            type="button"
            onClick={() =>
              addSession({ minutes: quickMinutes, type: 'vocab', note: 'Hızlı kayıt' })
            }
          >
            + Bugüne ekle
          </button>
          <Link className="btn ghost" to="/ingilizce">
            Detaylı ekle
          </Link>
        </div>
      </section>

      <section className="panel week-summary">
        <div className="panel-head">
          <h2>Bu haftanın özeti</h2>
          <span className="badge">
            {stats.weekTotal}/{stats.weekTarget} dk
          </span>
        </div>
        <div className="progress" style={{ marginBottom: '1rem' }}>
          <span style={{ width: `${stats.weekProgress}%` }} />
        </div>
        <div className="week-summary-grid">
          <div>
            <div className="label">Toplam</div>
            <div className="value">{stats.weekTotal} dk</div>
          </div>
          <div>
            <div className="label">Günlük ort.</div>
            <div className="value">{stats.weekAvg} dk</div>
          </div>
          <div>
            <div className="label">Aktif gün</div>
            <div className="value">{stats.activeDays}/7</div>
          </div>
          <div>
            <div className="label">Yeni kelime</div>
            <div className="value">{stats.weekWords}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-4" style={{ margin: '1rem 0' }}>
        <div className="stat">
          <div className="label">Bugün</div>
          <div className="value">{stats.todayMinutes} dk</div>
          <div className="hint">%{stats.dailyProgress} tamamlandı</div>
        </div>
        <div className="stat">
          <div className="label">Seri</div>
          <div className="value">{stats.streak}</div>
          <div className="hint">gün üst üste</div>
        </div>
        <div className="stat">
          <div className="label">Defter</div>
          <div className="value">{stats.wordCount}</div>
          <div className="hint">{stats.masteredWords} öğrenildi</div>
        </div>
        <div className="stat">
          <div className="label">Havuz</div>
          <div className="value">{stats.wordbankKnown}</div>
          <div className="hint">
            {stats.wordbankLearning} öğreniliyor · {stats.wordbankHard} zor
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <h2>Hızlı devam</h2>
        </div>
        <div className="quick-row">
          <Link className="btn" to="/ogrenme">
            Günlük görev
          </Link>
          <Link className="btn ghost" to="/ingilizce?mod=havuz">
            Kelime havuzu
          </Link>
          <Link className="btn ghost" to="/ogrenme">
            SRS tekrar ({stats.dueCount})
          </Link>
          <Link className="btn ghost" to="/arkadaslar">
            Arkadaşlar
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <h2>Bugünkü görev</h2>
          {stats.questDone ? (
            <span className="badge ok">tamam</span>
          ) : (
            <span className="badge">
              {stats.questWords}/{stats.dailyWordsTarget} kelime ·{' '}
              {stats.todayMinutes}/{stats.dailyTarget} dk
            </span>
          )}
        </div>
        <div className="quest-grid">
          <div>
            <div className="label">Kelime</div>
            <div className="progress" style={{ marginTop: '0.4rem' }}>
              <span
                style={{
                  width: `${Math.min(100, Math.round((stats.questWords / stats.dailyWordsTarget) * 100))}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="label">Dakika</div>
            <div className="progress" style={{ marginTop: '0.4rem' }}>
              <span style={{ width: `${stats.dailyProgress}%` }} />
            </div>
          </div>
        </div>
        {(data.badges || []).length > 0 && (
          <p className="item-meta" style={{ marginTop: '0.85rem' }}>
            {(data.badges || []).length} rozet ·{' '}
            <Link to="/ogrenme">tümünü gör</Link>
          </p>
        )}
      </section>

      {dailyWords.length > 0 && (
        <section className="panel" style={{ marginBottom: '1rem' }}>
          <div className="panel-head">
            <h2>Bugünün önerilen kelimeleri</h2>
            <Link className="btn ghost btn-sm" to="/ingilizce?mod=havuz">
              Havuzda aç
            </Link>
          </div>
          <div className="daily-words">
            {dailyWords.map((w) => (
              <div className="daily-word-row" key={w.id}>
                <div>
                  <strong>{w.word}</strong>
                  <div className="item-meta">{w.meaningTr}</div>
                </div>
                <button
                  className="btn ghost btn-sm"
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      const utter = new SpeechSynthesisUtterance(w.word)
                      utter.lang = 'en-US'
                      window.speechSynthesis.cancel()
                      window.speechSynthesis.speak(utter)
                    }
                  }}
                  title="Telaffuz"
                >
                  Dinle
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <h2>Havuz bandı ilerlemesi</h2>
          <span className="badge">{stats.wordbankKnown} bilinen</span>
        </div>
        <div className="band-progress-list">
          {bandProgress.map((b) => (
            <div className="band-progress-row" key={b.id}>
              <div className="band-progress-meta">
                <span>{b.label}</span>
                <span className="item-meta">
                  {b.known} bilinen · {b.touched} çalışılmış
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>


      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Son 7 gün</h2>
            <span className="item-meta">toplam {stats.weekTotal} dk</span>
          </div>
          <div className="bars">
            {stats.weekDays.map((d) => (
              <div className="bar" key={d.date}>
                <div
                  className="bar-fill"
                  style={{ height: `${Math.max(6, (d.minutes / maxWeek) * 120)}px` }}
                  title={`${d.minutes} dk`}
                />
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Aktif hedefler</h2>
            <Link className="btn ghost btn-sm" to="/hedefler">
              Tümü
            </Link>
          </div>
          {recentGoals.length === 0 ? (
            <div className="empty">
              <p>Henüz hedef yok. Küçük bir hedefle başla.</p>
              <Link className="btn btn-sm" to="/hedefler">
                İlk hedefi ekle
              </Link>
            </div>
          ) : (
            <div className="list">
              {recentGoals.map((g) => (
                <div className="item" key={g.id}>
                  <div className="item-top">
                    <div className="item-title">{g.title}</div>
                    <span className="badge">{g.progress}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>Son kelimeler</h2>
          <div className="item-actions">
            <Link className="btn ghost btn-sm" to="/ingilizce?mod=kartlar">
              Kart çalış
            </Link>
            <Link className="btn ghost btn-sm" to="/ingilizce">
              İngilizce
            </Link>
          </div>
        </div>
        {recentWords.length === 0 ? (
          <div className="empty">
            <p>Defter boş. Havuzdan çalışıp deftere ekleyebilirsin.</p>
            <Link className="btn btn-sm" to="/ingilizce?mod=havuz">
              Havuzu aç
            </Link>
          </div>
        ) : (

          <div className="list">
            {recentWords.map((w) => (
              <div className={`item word ${w.mastered ? 'mastered' : ''}`} key={w.id}>
                <div className="item-top">
                  <div>
                    <div className="item-title">{w.word}</div>
                    <div className="item-meta">{w.meaning}</div>
                  </div>
                  {w.mastered && <span className="badge ok">öğrenildi</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
