import { useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { api } from '../lib/api'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Files() {
  const { data, setFiles } = useApp()
  const { push } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [query, setQuery] = useState('')

  const files = useMemo(() => {
    const list = data.files || []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((f) => f.originalName.toLowerCase().includes(q))
  }, [data.files, query])

  const upload = async (fileList) => {
    const chosen = Array.from(fileList || [])
    if (!chosen.length) return
    setBusy(true)
    try {
      let latest = data.files || []
      for (const file of chosen) {
        if (file.size > 8 * 1024 * 1024) {
          push(`${file.name} 8 MB üstü, atlandı`, 'error')
          continue
        }
        const res = await api.uploadFile(file)
        latest = res.files
      }
      setFiles(latest)
      push('Dosya yüklendi')
    } catch (err) {
      push(err.message || 'Yükleme başarısız', 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    upload(e.dataTransfer.files)
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dosyalar</h1>
        <p>
          PDF, not, çalışma kağıdı veya görsellerini hesabına yükle. En fazla 8 MB.
        </p>
      </div>

      <section
        className={`panel dropzone ${dragOver ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <h2>Dosya yükle</h2>
        <p className="item-meta">Sürükle-bırak veya bilgisayardan seç.</p>
        <div className="quick-row" style={{ marginTop: '1rem' }}>
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Yükleniyor...' : 'Dosya seç'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
        </div>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <h2>Kayıtlı dosyalar ({files.length})</h2>
        </div>
        <div className="field" style={{ marginBottom: '0.9rem' }}>
          <label htmlFor="file-search">Ara</label>
          <input
            id="file-search"
            placeholder="Dosya adı..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {files.length === 0 ? (
          <div className="empty">
            <p>Henüz dosya yok. PDF veya çalışma kağıdını sürükleyip bırakabilirsin.</p>
          </div>
        ) : (
          <div className="list">
            {files.map((f) => (
              <div className="item" key={f.id}>
                <div className="item-top">
                  <div>
                    <div className="item-title">{f.originalName}</div>
                    <div className="item-meta">
                      {formatSize(f.size)}
                      {f.uploadedAt
                        ? ` · ${format(parseISO(f.uploadedAt), 'd MMM yyyy HH:mm', { locale: tr })}`
                        : ''}
                    </div>
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="btn ghost btn-sm"
                    type="button"
                    onClick={async () => {
                      try {
                        await api.downloadFile(f.id, f.originalName)
                      } catch (err) {
                        push(err.message || 'İndirme başarısız', 'error')
                      }
                    }}
                  >
                    İndir
                  </button>
                  <button
                    className="btn danger btn-sm"
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`“${f.originalName}” silinsin mi?`)) return
                      try {
                        const res = await api.deleteFile(f.id)
                        setFiles(res.files)
                        push('Dosya silindi')
                      } catch (err) {
                        push(err.message || 'Silinemedi', 'error')
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
  )
}
