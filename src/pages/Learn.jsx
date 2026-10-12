import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { listDueIds } from '../lib/srs'
import { speak, canSpeak } from '../lib/tts'
import { buildReadingPassage, highlightHtml } from '../lib/reading'
import { BADGE_DEFS } from '../lib/badges'

const BANDS = [
  { id: '1-1000', from: 1, to: 1000, label: '1–1000' },
  { id: '1001-2000', from: 1001, to: 2000, label: '1001–2000' },
  { id: '2001-3000', from: 2001, to: 3000, label: '2001–3000' },
  { id: '3001-5000', from: 3001, to: 5000, label: '3001–5000' },
  { id: '5001-7500', from: 5001, to: 7500, label: '5001–7500' },
  { id: '7501-10000', from: 7501, to: 10000, label: '7501–10000' },
]

const PLACEMENT_RANKS = [50, 200, 450, 800, 1200, 1600, 2200, 2800, 3500, 4500, 6000, 8500]

function bandFromScore(correct) {
  if (correct <= 3) return BANDS[0]
  if (correct <= 6) return BANDS[1]
  if (correct <= 9) return BANDS[2]
  if (correct <= 11) return BANDS[3]
  return BANDS[4]
}

export default function Learn() {
  const { data, stats, setWordbankStatus, updateSettings, addSession } = useApp()
  const { push } = useToast()
  const [tab, setTab] = useState('gorev')
  const [dueItems, setDueItems] = useState([])
  const [dueIndex, setDueIndex] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [placement, setPlacement] = useState([])
  const [placeIndex, setPlaceIndex] = useState(0)
  const [placeScore, setPlaceScore] = useState(0)
  const [placeDone, setPlaceDone] = useState(false)
  const [reading, setReading] = useState(null)
  const [quickMin, setQuickMin] = useState(20)

  const dueIds = useMemo(
    () => listDueIds(data.srs, data.wordbankProgress, 40),
    [data.srs, data.wordbankProgress],
  )

  const loadDue = useCallback(async () => {
    if (!dueIds.length) {
      setDueItems([])
      return
    }
    setBusy(true)
    try {
      const ids = dueIds.map((d) => d.id)
      const ranks = ids.map((id) => Number(String(id).replace(/^w/, ''))).filter(Boolean)
      const from = Math.min(...ranks)
      const to = Math.max(...ranks)
      const res = await api.wordbank({ from, to, limit: 200, status: '' })
      const map = new Map((res.items || []).map((w) => [w.id, w]))
      const ordered = ids.map((id) => map.get(id)).filter(Boolean)
      setDueItems(ordered)
      setDueIndex(0)
      setShowMeaning(false)
    } catch (err) {
      push(err.message || 'Tekrar listesi yüklenemedi', 'error')
    } finally {
      setBusy(false)
    }
  }, [dueIds, push])

  useEffect(() => {
    if (tab === 'tekrar') loadDue()
  }, [tab, loadDue])

  const startPlacement = async () => {
    setBusy(true)
    setPlaceDone(false)
    setPlaceScore(0)
    setPlaceIndex(0)
    try {
      const items = []
      for (const rank of PLACEMENT_RANKS) {
        const res = await api.wordbank({
          from: rank,
          to: rank,
          limit: 1,
          qualityOnly: '1',
        })
        if (res.items?.[0]) items.push(res.items[0])
      }
      if (items.length < 6) {
        const fallback = await api.wordbank({
          from: 1,
          to: 3000,
          limit: 12,
          qualityOnly: '1',
        })
        setPlacement((fallback.items || []).slice(0, 12))
      } else {
        setPlacement(items)
      }
      setTab('seviye')
    } catch (err) {
      push(err.message || 'Seviye testi yüklenemedi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const answerPlacement = (knows) => {
    const nextScore = placeScore + (knows ? 1 : 0)
    const nextIndex = placeIndex + 1
    if (nextIndex >= placement.length) {
      const band = bandFromScore(nextScore)
      updateSettings({
        wordbankBand: band.id,
        placementDone: true,
      })
      setPlaceScore(nextScore)
      setPlaceDone(true)
      push(`Yerleştirme: ${band.label} bandı önerildi`)
      return
    }
    setPlaceScore(nextScore)
    setPlaceIndex(nextIndex)
  }

  const buildReading = async () => {
    setBusy(true)
    try {
      const knownIds = Object.entries(data.wordbankProgress || {})
        .filter(([, s]) => s === 'known' || s === 'learning')
        .map(([id]) => id)
        .slice(0, 40)
      let words = data.vocabulary.slice(0, 5).map((w) => w.word)
      if (knownIds.length) {
        const ranks = knownIds
          .map((id) => Number(String(id).replace(/^w/, '')))
          .filter(Boolean)
        const from = Math.max(1, Math.min(...ranks) - 5)
        const to = Math.min(10000, Math.max(...ranks) + 5)
        const res = await api.wordbank({ from, to, limit: 80 })
        const picked = (res.items || [])
          .filter((w) => knownIds.includes(w.id))
          .slice(0, 5)
        if (picked.length) words = picked.map((w) => w.word)
      }
      const passage = buildReadingPassage(words)
      setReading(passage)
      setTab('okuma')
    } catch (err) {
      push(err.message || 'Paragraf üretilemedi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const currentDue = dueItems[dueIndex] || null

  const markDue = async (status) => {
    if (!currentDue) return
    try {
      await setWordbankStatus(currentDue.id, status)
      setShowMeaning(false)
      setDueIndex((i) => Math.min(i + 1, Math.max(0, dueItems.length - 1)))
      setDueItems((prev) => prev.filter((w) => w.id !== currentDue.id))
    } catch (err) {
      push(err.message || 'Kaydedilemedi', 'error')
    }
  }

  const wordsPct = Math.min(
    100,
    Math.round((stats.questWords / stats.dailyWordsTarget) * 100),
  )
  const minPct = Math.min(
    100,
    Math.round((stats.todayMinutes / stats.dailyTarget) * 100),
  )

  const unlocked = useMemo(() => {
    const set = new Set(data.badges || [])
    return BADGE_DEFS.map((b) => ({ ...b, unlocked: set.has(b.id) }))
  }, [data.badges])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Öğrenme</h1>
        <p>
          Günlük görev, tekrar (SRS), seviye testi ve bağlamlı okuma — tek ekranda.
        </p>
      </div>

      <div className="learn-tabs">
        {[
          { id: 'gorev', label: 'Görev' },
          { id: 'tekrar', label: `Tekrar (${stats.dueCount})` },
          { id: 'seviye', label: 'Seviye' },
          { id: 'okuma', label: 'Okuma' },
          { id: 'rozet', label: 'Rozetler' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? '' : 'ghost'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gorev' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Bugünkü görev</h2>
            {stats.questDone ? (
              <span className="badge ok">tamam</span>
            ) : (
              <span className="badge">devam</span>
            )}
          </div>
          <p className="item-meta" style={{ marginBottom: '1rem' }}>
            Hedef: {stats.dailyWordsTarget} kelime + {stats.dailyTarget} dk
          </p>
          <div className="quest-grid">
            <div>
              <div className="label">Kelime</div>
              <div className="value">
                {stats.questWords}/{stats.dailyWordsTarget}
              </div>
              <div className="progress" style={{ marginTop: '0.5rem' }}>
                <span style={{ width: `${wordsPct}%` }} />
              </div>
            </div>
            <div>
              <div className="label">Dakika</div>
              <div className="value">
                {stats.todayMinutes}/{stats.dailyTarget}
              </div>
              <div className="progress" style={{ marginTop: '0.5rem' }}>
                <span style={{ width: `${minPct}%` }} />
              </div>
            </div>
          </div>
          <div className="quick-row" style={{ marginTop: '1rem' }}>
            <Link className="btn" to="/ingilizce?mod=havuz">
              Kelime çalış
            </Link>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setTab('tekrar')}
            >
              SRS tekrar
            </button>
            <div className="field compact">
              <label htmlFor="learn-min">dk ekle</label>
              <input
                id="learn-min"
                type="number"
                min="5"
                max="180"
                value={quickMin}
                onChange={(e) => setQuickMin(e.target.value)}
              />
            </div>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                addSession({
                  minutes: quickMin,
                  type: 'vocab',
                  note: 'Günlük görev',
                })
              }
            >
              + Seans
            </button>
          </div>
          <p className="item-meta" style={{ marginTop: '1rem' }}>
            Aktif bant:{' '}
            <strong>
              {BANDS.find((b) => b.id === data.settings?.wordbankBand)?.label ||
                data.settings?.wordbankBand}
            </strong>
            {!data.settings?.placementDone && (
              <>
                {' '}
                ·{' '}
                <button className="linkish" type="button" onClick={startPlacement}>
                  Seviye testini yap
                </button>
              </>
            )}
          </p>
        </section>
      )}

      {tab === 'tekrar' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Tekrar (SRS)</h2>
            <span className="item-meta">{dueItems.length} kart</span>
          </div>
          {busy && <div className="empty">Yükleniyor...</div>}
          {!busy && !currentDue && (
            <div className="empty">
              <p>Bugün vadesi gelen kart yok. Yeni kelime çalışarak havuzu doldur.</p>
              <Link className="btn btn-sm" to="/ingilizce?mod=havuz">
                Havuzu aç
              </Link>
            </div>
          )}
          {!busy && currentDue && (
            <>
              <div className="wordbank-card">
                <div className="wordbank-rank">#{currentDue.rank}</div>
                <strong className="wordbank-word">{currentDue.word}</strong>
                <div className="quick-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    className="btn ghost btn-sm"
                    type="button"
                    onClick={() => speak(currentDue.word)}
                    disabled={!canSpeak()}
                  >
                    Kelimeyi dinle
                  </button>
                  {currentDue.example && (
                    <button
                      className="btn ghost btn-sm"
                      type="button"
                      onClick={() => speak(currentDue.example)}
                      disabled={!canSpeak()}
                    >
                      Örneği dinle
                    </button>
                  )}
                </div>
                {showMeaning ? (
                  <>
                    <p className="wordbank-meaning">{currentDue.meaningTr}</p>
                    <p className="wordbank-example">“{currentDue.example}”</p>
                  </>
                ) : (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setShowMeaning(true)}
                  >
                    Anlamı göster
                  </button>
                )}
              </div>
              <div className="quick-row wordbank-actions">
                <button className="btn ghost" type="button" onClick={() => markDue('hard')}>
                  Zor
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => markDue('learning')}
                >
                  Öğreniyorum
                </button>
                <button className="btn" type="button" onClick={() => markDue('known')}>
                  Öğrendim
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'seviye' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Seviye yerleştirme</h2>
            <span className="item-meta">12 kısa soru</span>
          </div>
          {!placement.length && !placeDone && (
            <div className="empty">
              <p>
                Kısa test sonucunda otomatik havuz bandın (1–1000, 1001–2000…) seçilir.
              </p>
              <button className="btn" type="button" disabled={busy} onClick={startPlacement}>
                {busy ? 'Hazırlanıyor...' : 'Teste başla'}
              </button>
            </div>
          )}
          {placement.length > 0 && !placeDone && (
            <>
              <p className="item-meta">
                Soru {placeIndex + 1}/{placement.length} · doğru {placeScore}
              </p>
              <div className="wordbank-card">
                <strong className="wordbank-word">{placement[placeIndex]?.word}</strong>
                <p className="wordbank-meaning">{placement[placeIndex]?.meaningTr}</p>
                <p className="wordbank-example">“{placement[placeIndex]?.example}”</p>
              </div>
              <div className="quick-row">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => answerPlacement(false)}
                >
                  Bilmiyorum
                </button>
                <button className="btn" type="button" onClick={() => answerPlacement(true)}>
                  Biliyorum
                </button>
              </div>
            </>
          )}
          {placeDone && (
            <div className="empty">
              <p>
                Skor {placeScore}/{placement.length}. Önerilen bant:{' '}
                <strong>
                  {BANDS.find((b) => b.id === data.settings?.wordbankBand)?.label}
                </strong>
              </p>
              <Link className="btn" to="/ingilizce?mod=havuz">
                Bu bantta çalış
              </Link>
              <button className="btn ghost" type="button" onClick={startPlacement}>
                Tekrar dene
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'okuma' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Bağlamlı okuma</h2>
            <button className="btn ghost btn-sm" type="button" onClick={buildReading}>
              Yeni paragraf
            </button>
          </div>
          {!reading && (
            <div className="empty">
              <p>Öğrendiğin kelimelerle kısa bir İngilizce paragraf üret.</p>
              <button className="btn" type="button" disabled={busy} onClick={buildReading}>
                Üret
              </button>
            </div>
          )}
          {reading && (
            <>
              <div
                className="reading-passage"
                dangerouslySetInnerHTML={{
                  __html: highlightHtml(reading.text, reading.highlights),
                }}
              />
              <div className="quick-row" style={{ marginTop: '1rem' }}>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => speak(reading.text, { rate: 0.88 })}
                  disabled={!canSpeak()}
                >
                  Paragrafı dinle
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    addSession({
                      minutes: 10,
                      type: 'reading',
                      note: 'Bağlamlı okuma',
                    })
                  }
                >
                  +10 dk okuma
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'rozet' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Rozetler</h2>
            <span className="badge">
              {unlocked.filter((b) => b.unlocked).length}/{unlocked.length}
            </span>
          </div>
          <div className="badge-grid">
            {unlocked.map((b) => (
              <div
                className={`badge-card ${b.unlocked ? 'on' : 'off'}`}
                key={b.id}
              >
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
