import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

export default function Friends() {
  const { data, stats, addFriend, removeFriend } = useApp()
  const { push } = useToast()
  const [shareCode, setShareCode] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [profiles, setProfiles] = useState({})

  useEffect(() => {
    api
      .myShare()
      .then((res) => setShareCode(res.shareCode || ''))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      const next = {}
      for (const f of data.friends || []) {
        try {
          const res = await api.publicProfile(f.code)
          next[f.code] = res
        } catch {
          next[f.code] = null
        }
      }
      if (alive) setProfiles(next)
    }
    load()
    return () => {
      alive = false
    }
  }, [data.friends])

  const copyCode = async () => {
    if (!shareCode) return
    try {
      await navigator.clipboard.writeText(shareCode)
      push('Paylaşım kodu kopyalandı')
    } catch {
      push('Kopyalanamadı — kodu elle seç', 'error')
    }
  }

  const onAdd = async (e) => {
    e.preventDefault()
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    if (code === shareCode) {
      push('Kendi kodunu ekleyemezsin', 'error')
      return
    }
    setBusy(true)
    try {
      const res = await api.publicProfile(code)
      addFriend({ code: res.shareCode || code, name: res.name })
      setCodeInput('')
    } catch (err) {
      push(err.message || 'Kod bulunamadı', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Arkadaşlar</h1>
        <p>Paylaşım koduyla seri ve haftalık dakikayı karşılaştır.</p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Senin kodun</h2>
          <button className="btn ghost btn-sm" type="button" onClick={copyCode}>
            Kopyala
          </button>
        </div>
        <p className="share-code">{shareCode || '...'}</p>
        <div className="week-summary-grid" style={{ marginTop: '1rem' }}>
          <div>
            <div className="label">Seri</div>
            <div className="value">{stats.streak}</div>
          </div>
          <div>
            <div className="label">Bu hafta</div>
            <div className="value">{stats.weekTotal} dk</div>
          </div>
          <div>
            <div className="label">Havuz</div>
            <div className="value">{stats.wordbankKnown}</div>
          </div>
          <div>
            <div className="label">Bugün</div>
            <div className="value">{stats.todayMinutes} dk</div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2>Arkadaş ekle</h2>
        <form className="form" onSubmit={onAdd}>
          <div className="field">
            <label htmlFor="friend-code">Paylaşım kodu</label>
            <input
              id="friend-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Örn. ROTAAB12"
              maxLength={12}
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Kontrol...' : 'Ekle'}
          </button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>Karşılaştırma</h2>
          <span className="item-meta">{(data.friends || []).length} kişi</span>
        </div>
        {(data.friends || []).length === 0 ? (
          <div className="empty">
            Henüz arkadaş yok. Kodunu paylaş veya bir kod ekle.
          </div>
        ) : (
          <div className="list">
            {(data.friends || []).map((f) => {
              const p = profiles[f.code]
              const s = p?.stats
              return (
                <div className="item" key={f.code}>
                  <div className="item-top">
                    <div>
                      <div className="item-title">{p?.name || f.name}</div>
                      <div className="item-meta">{f.code}</div>
                    </div>
                    <button
                      className="btn ghost btn-sm"
                      type="button"
                      onClick={() => removeFriend(f.code)}
                    >
                      Kaldır
                    </button>
                  </div>
                  {s ? (
                    <div className="friend-stats">
                      <span>
                        Seri <strong>{s.streak}</strong>
                        {s.streak > stats.streak ? ' ↑' : s.streak < stats.streak ? ' ↓' : ''}
                      </span>
                      <span>
                        Hafta <strong>{s.weekMinutes} dk</strong>
                        {s.weekMinutes > stats.weekTotal
                          ? ' ↑'
                          : s.weekMinutes < stats.weekTotal
                            ? ' ↓'
                            : ''}
                      </span>
                      <span>
                        Havuz <strong>{s.wordbankKnown}</strong>
                      </span>
                    </div>
                  ) : (
                    <p className="item-meta">Profil yüklenemedi</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
