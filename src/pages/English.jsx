import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useApp } from '../context/AppContext'
import WordBank from '../components/WordBank'

const TYPES = [
  { value: 'vocab', label: 'Kelime' },
  { value: 'reading', label: 'Okuma' },
  { value: 'listening', label: 'Dinleme' },
  { value: 'speaking', label: 'Konuşma' },
  { value: 'grammar', label: 'Gramer' },
  { value: 'other', label: 'Diğer' },
]

const typeLabel = (value) => TYPES.find((t) => t.value === value)?.label || value

export default function English() {
  const [params, setParams] = useSearchParams()
  const modeParam = params.get('mod')
  const mode =
    modeParam === 'kartlar' ? 'kartlar' : modeParam === 'havuz' ? 'havuz' : 'defter'
  const {
    data,
    stats,
    addSession,
    removeSession,
    addWord,
    toggleWord,
    removeWord,
  } = useApp()

  const [session, setSession] = useState({
    minutes: 25,
    type: 'vocab',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [word, setWord] = useState({ word: '', meaning: '', example: '' })
  const [query, setQuery] = useState('')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.vocabulary
    return data.vocabulary.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.example.toLowerCase().includes(q),
    )
  }, [data.vocabulary, query])

  const cards = data.vocabulary.filter((w) => !w.mastered)
  const current = cards[cardIndex] || null

  const submitSession = (e) => {
    e.preventDefault()
    if (!session.minutes) return
    addSession(session)
    setSession((s) => ({ ...s, note: '', minutes: 25 }))
  }

  const submitWord = (e) => {
    e.preventDefault()
    if (!word.word.trim() || !word.meaning.trim()) return
    addWord(word)
    setWord({ word: '', meaning: '', example: '' })
  }

  const nextCard = () => {
    setFlipped(false)
    setCardIndex((i) => (cards.length ? (i + 1) % cards.length : 0))
  }

  const markKnown = () => {
    if (!current) return
    toggleWord(current.id)
    setFlipped(false)
    setCardIndex((i) => {
      const remaining = cards.length - 1
      if (remaining <= 0) return 0
      return i % remaining
    })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>İngilizce izi</h1>
        <p>
          Bu hafta <strong style={{ color: 'var(--accent)' }}>{stats.weekTotal} dk</strong>.
          Defter, kartlar veya 10.000 kelimelik havuzla çalış.
        </p>
        <div className="segment segment-3">
          <button
            type="button"
            className={mode === 'defter' ? 'active' : ''}
            onClick={() => setParams({})}
          >
            Defter
          </button>
          <button
            type="button"
            className={mode === 'kartlar' ? 'active' : ''}
            onClick={() => setParams({ mod: 'kartlar' })}
          >
            Kartlar
          </button>
          <button
            type="button"
            className={mode === 'havuz' ? 'active' : ''}
            onClick={() => setParams({ mod: 'havuz' })}
          >
            Havuz
          </button>
        </div>
      </div>

      {mode === 'havuz' ? (
        <WordBank />
      ) : mode === 'kartlar' ? (
        <section className="panel flash-panel">
          <div className="panel-head">
            <h2>Kelime kartları</h2>
            <span className="item-meta">
              {cards.length} öğrenilecek · {stats.masteredWords} tamam
            </span>
          </div>
          {!current ? (
            <div className="empty">
              <p>Öğrenilecek kelime kalmadı. Yeni ekle veya hepsini tekrar aç.</p>
              <Link className="btn btn-sm" to="/ingilizce">
                Deftere dön
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`flash-card ${flipped ? 'flipped' : ''}`}
                onClick={() => setFlipped((f) => !f)}
              >
                <span className="flash-label">{flipped ? 'Anlam' : 'Kelime'}</span>
                <strong>{flipped ? current.meaning : current.word}</strong>
                {flipped && current.example && (
                  <em>“{current.example}”</em>
                )}
                <small>Çevirmek için dokun</small>
              </button>
              <div className="quick-row">
                <button className="btn ghost" type="button" onClick={nextCard}>
                  Sonraki
                </button>
                <button className="btn" type="button" onClick={markKnown}>
                  Biliyorum
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="split">
          <section className="panel">
            <h2>Çalışma ekle</h2>
            <form className="form" onSubmit={submitSession}>
              <div className="form row">
                <div className="field">
                  <label htmlFor="minutes">Dakika</label>
                  <input
                    id="minutes"
                    type="number"
                    min="1"
                    max="600"
                    value={session.minutes}
                    onChange={(e) =>
                      setSession((s) => ({ ...s, minutes: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="type">Tür</label>
                  <select
                    id="type"
                    value={session.type}
                    onChange={(e) =>
                      setSession((s) => ({ ...s, type: e.target.value }))
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="date">Tarih</label>
                  <input
                    id="date"
                    type="date"
                    value={session.date}
                    onChange={(e) =>
                      setSession((s) => ({ ...s, date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="note">Not</label>
                <input
                  id="note"
                  placeholder="Örn. TED talk, B2 listesi..."
                  value={session.note}
                  onChange={(e) =>
                    setSession((s) => ({ ...s, note: e.target.value }))
                  }
                />
              </div>
              <button className="btn" type="submit">
                Kaydet
              </button>
            </form>

            <h2 style={{ marginTop: '1.5rem' }}>Son seanslar</h2>
            {data.studySessions.length === 0 ? (
              <div className="empty">Henüz seans yok.</div>
            ) : (
              <div className="list">
                {data.studySessions.slice(0, 12).map((s) => (
                  <div className="item" key={s.id}>
                    <div className="item-top">
                      <div>
                        <div className="item-title">
                          {s.minutes} dk · {typeLabel(s.type)}
                        </div>
                        <div className="item-meta">
                          {format(parseISO(s.date), 'd MMM yyyy', { locale: tr })}
                          {s.note ? ` · ${s.note}` : ''}
                        </div>
                      </div>
                      <button
                        className="btn danger btn-sm"
                        type="button"
                        onClick={() => {
                          if (window.confirm('Bu seansı silmek istiyor musun?')) {
                            removeSession(s.id)
                          }
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Kelime ekle</h2>
            <form className="form" onSubmit={submitWord}>
              <div className="field">
                <label htmlFor="word">Kelime</label>
                <input
                  id="word"
                  placeholder="resilient"
                  value={word.word}
                  onChange={(e) => setWord((w) => ({ ...w, word: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="meaning">Anlam</label>
                <input
                  id="meaning"
                  placeholder="dayanıklı"
                  value={word.meaning}
                  onChange={(e) =>
                    setWord((w) => ({ ...w, meaning: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="example">Örnek cümle</label>
                <textarea
                  id="example"
                  placeholder="She stayed resilient after the setback."
                  value={word.example}
                  onChange={(e) =>
                    setWord((w) => ({ ...w, example: e.target.value }))
                  }
                />
              </div>
              <button className="btn" type="submit">
                Deftere ekle
              </button>
            </form>

            <div className="panel-head" style={{ marginTop: '1.5rem' }}>
              <h2>Defter ({filteredWords.length})</h2>
            </div>
            <div className="field">
              <label htmlFor="search">Ara</label>
              <input
                id="search"
                placeholder="Kelime veya anlam..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filteredWords.length === 0 ? (
              <div className="empty">Sonuç yok.</div>
            ) : (
              <div className="list" style={{ marginTop: '0.8rem' }}>
                {filteredWords.map((w) => (
                  <div
                    className={`item word ${w.mastered ? 'mastered' : ''}`}
                    key={w.id}
                  >
                    <div className="item-top">
                      <div>
                        <div className="item-title">{w.word}</div>
                        <div className="item-meta">{w.meaning}</div>
                        {w.example && (
                          <div className="item-meta" style={{ fontStyle: 'italic' }}>
                            “{w.example}”
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn ghost btn-sm"
                        type="button"
                        onClick={() => toggleWord(w.id)}
                      >
                        {w.mastered ? 'Tekrar aç' : 'Öğrendim'}
                      </button>
                      <button
                        className="btn danger btn-sm"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`“${w.word}” silinsin mi?`)) {
                            removeWord(w.id)
                          }
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
