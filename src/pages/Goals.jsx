import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useApp } from '../context/AppContext'

const CATEGORIES = [
  { value: 'ingilizce', label: 'İngilizce' },
  { value: 'kariyer', label: 'Kariyer' },
  { value: 'saglik', label: 'Sağlık' },
  { value: 'genel', label: 'Genel' },
]

const catLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value

export default function Goals() {
  const { data, addGoal, setGoalProgress, toggleGoalDone, removeGoal } = useApp()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'ingilizce',
    targetDate: '',
  })

  const active = data.goals.filter((g) => g.status === 'active')
  const done = data.goals.filter((g) => g.status === 'done')

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addGoal(form)
    setForm({
      title: '',
      description: '',
      category: 'ingilizce',
      targetDate: '',
    })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Hedefler</h1>
        <p>
          Ne peşindesin? Yaz, ilerlemeyi kaydır, bitince işaretle. Hepsi hesabına
          bağlı kalır.
        </p>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Yeni hedef</h2>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="title">Başlık</label>
              <input
                id="title"
                placeholder="Örn. B2 seviyesine çık"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="description">Açıklama</label>
              <textarea
                id="description"
                placeholder="Nasıl ölçeceksin?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="form row">
              <div className="field">
                <label htmlFor="category">Kategori</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="targetDate">Hedef tarih</label>
                <input
                  id="targetDate"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <button className="btn" type="submit">
              Hedef ekle
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Aktif ({active.length})</h2>
          {active.length === 0 ? (
            <div className="empty">Aktif hedef yok.</div>
          ) : (
            <div className="list">
              {active.map((g) => (
                <div className="item" key={g.id}>
                  <div className="item-top">
                    <div>
                      <div className="item-title">{g.title}</div>
                      <div className="item-meta">
                        <span className="badge">{catLabel(g.category)}</span>
                        {g.targetDate
                          ? ` · ${format(parseISO(g.targetDate), 'd MMM yyyy', { locale: tr })}`
                          : ''}
                      </div>
                      {g.description && (
                        <div className="item-meta" style={{ marginTop: '0.35rem' }}>
                          {g.description}
                        </div>
                      )}
                    </div>
                    <span className="badge warn">{g.progress}%</span>
                  </div>
                  <input
                    className="range"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={g.progress}
                    onChange={(e) => setGoalProgress(g.id, e.target.value)}
                  />
                  <div className="progress">
                    <span style={{ width: `${g.progress}%` }} />
                  </div>
                  <div className="item-actions">
                    <button
                      className="btn ghost btn-sm"
                      type="button"
                      onClick={() => toggleGoalDone(g.id)}
                    >
                      Tamamla
                    </button>
                    <button
                      className="btn danger btn-sm"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`“${g.title}” silinsin mi?`)) {
                          removeGoal(g.id)
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

      {done.length > 0 && (
        <section className="panel" style={{ marginTop: '1rem' }}>
          <h2>Tamamlanan ({done.length})</h2>
          <div className="list">
            {done.map((g) => (
              <div className="item" key={g.id}>
                <div className="item-top">
                  <div>
                    <div className="item-title">{g.title}</div>
                    <div className="item-meta">{catLabel(g.category)}</div>
                  </div>
                  <span className="badge ok">bitti</span>
                </div>
                <div className="item-actions">
                  <button
                    className="btn ghost btn-sm"
                    type="button"
                    onClick={() => toggleGoalDone(g.id)}
                  >
                    Geri al
                  </button>
                  <button
                    className="btn danger btn-sm"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`“${g.title}” silinsin mi?`)) {
                        removeGoal(g.id)
                      }
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
