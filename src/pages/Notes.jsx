import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useApp } from '../context/AppContext'

export default function Notes() {
  const { data, addNote, removeNote } = useApp()
  const [form, setForm] = useState({ title: '', body: '' })

  const submit = (e) => {
    e.preventDefault()
    if (!form.body.trim()) return
    addNote(form)
    setForm({ title: '', body: '' })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Notlar</h1>
        <p>Kısa düşünceler ve planlar — hesabına özel, kaybolmaz.</p>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Yeni not</h2>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="note-title">Başlık</label>
              <input
                id="note-title"
                placeholder="İsteğe bağlı"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="note-body">İçerik</label>
              <textarea
                id="note-body"
                placeholder="Bugün ne düşündün?"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <button className="btn" type="submit">
              Kaydet
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Kayıtlar ({data.notes.length})</h2>
          {data.notes.length === 0 ? (
            <div className="empty">
              <p>Henüz not yok. Kısa bir düşünce bırakarak başla.</p>
            </div>
          ) : (
            <div className="list">
              {data.notes.map((n) => (
                <div className="item" key={n.id}>
                  <div className="item-top">
                    <div>
                      <div className="item-title">{n.title}</div>
                      <div className="item-meta">
                        {format(parseISO(n.createdAt), 'd MMM yyyy · HH:mm', {
                          locale: tr,
                        })}
                      </div>
                      <div style={{ marginTop: '0.45rem', whiteSpace: 'pre-wrap' }}>
                        {n.body}
                      </div>
                    </div>
                    <button
                      className="btn danger btn-sm"
                      type="button"
                      onClick={() => {
                        if (window.confirm('Bu not silinsin mi?')) {
                          removeNote(n.id)
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
    </div>
  )
}
