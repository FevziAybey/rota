import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { isQualityMeaning } from '../lib/wordQuality'
import { speak as ttsSpeak } from '../lib/tts'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

const BANDS = [
  { id: '1-1000', from: 1, to: 1000, label: '1–1000' },
  { id: '1001-2000', from: 1001, to: 2000, label: '1001–2000' },
  { id: '2001-3000', from: 2001, to: 3000, label: '2001–3000' },
  { id: '3001-5000', from: 3001, to: 5000, label: '3001–5000' },
  { id: '5001-7500', from: 5001, to: 7500, label: '5001–7500' },
  { id: '7501-10000', from: 7501, to: 10000, label: '7501–10000' },
]

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function WordBank() {
  const { stats, setWordbankStatus, data, addWord, updateSettings } = useApp()
  const { push } = useToast()
  const preferred =
    BANDS.find((b) => b.id === data.settings?.wordbankBand) || BANDS[0]
  const [band, setBand] = useState(preferred)
  const [filter, setFilter] = useState('new')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [index, setIndex] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState(null)
  const [quiz, setQuiz] = useState(false)
  const [choices, setChoices] = useState([])
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    const next = BANDS.find((b) => b.id === data.settings?.wordbankBand)
    if (next) setBand(next)
  }, [data.settings?.wordbankBand])

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const res = await api.wordbank({
        from: band.from,
        to: band.to,
        q: query.trim(),
        status: filter === 'all' ? '' : filter,
        qualityOnly: quiz ? '1' : '',
        offset: 0,
        limit: 100,
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
      setIndex(0)
      setShowMeaning(false)
      setPicked(null)
    } catch (err) {
      push(err.message || 'Havuz yüklenemedi', 'error')
    } finally {
      setBusy(false)
    }
  }, [band, filter, query, quiz, push])

  useEffect(() => {
    api.wordbankMeta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    setItems((prev) =>
      prev.map((w) => ({
        ...w,
        status: data.wordbankProgress?.[w.id] || 'new',
      })),
    )
  }, [data.wordbankProgress])

  const current = items[index] || null
  const progressLabel = useMemo(() => {
    if (!total) return '0 / 0'
    return `${Math.min(index + 1, total)} / ${total}`
  }, [index, total])

  const inNotebook = useMemo(() => {
    if (!current) return false
    const key = current.word.toLowerCase()
    return data.vocabulary.some((w) => w.word.trim().toLowerCase() === key)
  }, [current, data.vocabulary])

  const goNext = useCallback(() => {
    setShowMeaning(false)
    setPicked(null)
    setIndex((i) => (items.length ? (i + 1) % items.length : 0))
  }, [items.length])

  useEffect(() => {
    let alive = true
    async function buildChoices() {
      if (!quiz || !current) {
        setChoices([])
        return
      }
      if (!isQualityMeaning(current.meaningTr)) {
        setChoices([])
        return
      }
      try {
        const res = await api.wordbankDistractors(current.id, 3)
        const distractors = (res.meanings || []).filter(
          (m) => isQualityMeaning(m) && m !== current.meaningTr,
        )
        const local = shuffle(
          items.filter(
            (w) =>
              w.id !== current.id &&
              isQualityMeaning(w.meaningTr) &&
              w.meaningTr !== current.meaningTr,
          ),
        )
          .map((w) => w.meaningTr)
          .slice(0, 3)

        const pool = []
        const seen = new Set([current.meaningTr])
        for (const m of [...distractors, ...local]) {
          if (seen.has(m) || !isQualityMeaning(m)) continue
          seen.add(m)
          pool.push(m)
          if (pool.length >= 3) break
        }
        if (pool.length < 2) {
          if (alive) setChoices([])
          return
        }
        if (!alive) return
        setChoices(shuffle([current.meaningTr, ...pool.slice(0, 3)]))
        setPicked(null)
        setShowMeaning(false)
      } catch {
        if (alive) setChoices([])
      }
    }
    buildChoices()
    return () => {
      alive = false
    }
  }, [quiz, current, items, index])


  const mark = useCallback(
    async (status) => {
      if (!current) return
      try {
        await setWordbankStatus(current.id, status)
        goNext()
      } catch (err) {
        push(err.message || 'Kaydedilemedi', 'error')
      }
    },
    [current, setWordbankStatus, goNext, push],
  )

  const saveToNotebook = useCallback(() => {
    if (!current) return
    addWord({
      word: current.word,
      meaning: current.meaningTr,
      example: current.example,
      mastered: current.status === 'known',
    })
  }, [current, addWord])

  const speak = useCallback(() => {
    if (!current) return
    if (!ttsSpeak(current.word)) {
      window.open(
        `https://translate.google.com/?sl=en&tl=tr&text=${encodeURIComponent(current.word)}&op=translate`,
        '_blank',
        'noopener,noreferrer',
      )
    }
  }, [current])

  const speakExample = useCallback(() => {
    if (!current?.example) return
    ttsSpeak(current.example, { rate: 0.88 })
  }, [current])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea, select')) return
      if (!current) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (quiz) return
        setShowMeaning(true)
      } else if (e.key === '1') mark('known')
      else if (e.key === '2') mark('learning')
      else if (e.key === '3') mark('hard')
      else if (e.key === 'ArrowRight' || e.key === 'n') goNext()
      else if (e.key === 'd' || e.key === 'D') saveToNotebook()
      else if (e.key === 'p' || e.key === 'P') speak()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, quiz, mark, goNext, saveToNotebook, speak])

  const answerQuiz = async (choice) => {
    if (!current || picked) return
    setPicked(choice)
    const correct = choice === current.meaningTr
    if (correct) {
      push('Doğru!')
      await mark('known')
    } else {
      push('Yanlış — zor olarak işaretlendi', 'error')
      await mark('hard')
    }
  }

  return (
    <section className="panel wordbank-panel">
      <div className="panel-head">
        <h2>Kelime havuzu</h2>
        <span className="item-meta">
          {meta
            ? `${meta.total.toLocaleString('tr-TR')} kelime · ${(meta.quality || meta.seeded || 0).toLocaleString('tr-TR')} kaliteli anlam`
            : 'yükleniyor'}
        </span>
      </div>

      <div className="wordbank-stats">
        <span className="badge ok">öğrendim {stats.wordbankKnown}</span>
        <span className="badge warn">öğreniyorum {stats.wordbankLearning}</span>
        <span className="badge">zor {stats.wordbankHard}</span>
        <Link className="badge" to="/ogrenme">
          tekrar {stats.dueCount}
        </Link>
      </div>

      <div className="wordbank-controls">
        <div className="field">
          <label htmlFor="band">Sıklık aralığı</label>
          <select
            id="band"
            value={band.id}
            onChange={(e) => {
              const next = BANDS.find((b) => b.id === e.target.value) || BANDS[0]
              setBand(next)
              updateSettings({ wordbankBand: next.id }, { silent: true })
            }}
          >
            {BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wb-filter">Durum</label>
          <select
            id="wb-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tümü</option>
            <option value="new">Yeni</option>
            <option value="learning">Öğreniyorum</option>
            <option value="hard">Zor</option>
            <option value="known">Öğrendim</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="wb-q">Ara</label>
          <input
            id="wb-q"
            placeholder="kelime veya anlam..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="quick-row" style={{ marginBottom: '1rem' }}>
        <button
          className={`btn ${quiz ? '' : 'ghost'} btn-sm`}
          type="button"
          onClick={() => setQuiz((q) => !q)}
        >
          {quiz ? 'Kart modu' : 'Quiz modu'}
        </button>
        <span className="item-meta">
          Kısayollar: Boşluk=anlam · 1/2/3 · → · D=defter · P=telaffuz
        </span>
      </div>

      {busy && <div className="empty">Havuz yükleniyor...</div>}

      {!busy && !current && (
        <div className="empty">Bu filtrede kelime yok. Aralığı veya durumu değiştir.</div>
      )}

      {!busy && current && (
        <>
          <div className="wordbank-card">
            <div className="wordbank-rank">
              #{current.rank} · {progressLabel}
            </div>
            <strong className="wordbank-word">{current.word}</strong>
            <div className="quick-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn ghost btn-sm" type="button" onClick={speak}>
                Kelimeyi dinle
              </button>
              <button
                className="btn ghost btn-sm"
                type="button"
                onClick={speakExample}
                disabled={!current.example}
              >
                Örneği dinle
              </button>
            </div>

            {quiz ? (
              choices.length >= 3 ? (
                <div className="quiz-choices">
                  {choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={`btn ghost quiz-choice ${
                        picked
                          ? choice === current.meaningTr
                            ? 'correct'
                            : picked === choice
                              ? 'wrong'
                              : ''
                          : ''
                      }`}
                      disabled={Boolean(picked)}
                      onClick={() => answerQuiz(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="item-meta">Quiz için yeterli kaliteli şık yok — kart moduna geç.</p>
              )
            ) : showMeaning ? (
              <>
                <p className="wordbank-meaning">{current.meaningTr}</p>
                <p className="wordbank-example">“{current.example}”</p>
              </>
            ) : (
              <button
                className="btn ghost"
                type="button"
                onClick={() => setShowMeaning(true)}
              >
                Anlamı ve örneği göster
              </button>
            )}

            <span className={`badge status-${current.status}`}>
              {current.status === 'new'
                ? 'yeni'
                : current.status === 'known'
                  ? 'öğrendim'
                  : current.status === 'hard'
                    ? 'zor'
                    : 'öğreniyorum'}
            </span>
          </div>

          {!quiz && (
            <div className="quick-row wordbank-actions">
              <button className="btn ghost" type="button" onClick={() => mark('hard')}>
                Zor
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => mark('learning')}
              >
                Öğreniyorum
              </button>
              <button className="btn" type="button" onClick={() => mark('known')}>
                Öğrendim
              </button>
              <button className="btn ghost" type="button" onClick={goNext}>
                Sonraki
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={inNotebook}
                onClick={saveToNotebook}
              >
                {inNotebook ? 'Defterde' : 'Deftere ekle'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
