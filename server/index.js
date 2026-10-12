import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import {
  createUser,
  ensureShareCode,
  findUserByEmail,
  findUserById,
  findUserByShareCode,
  getUserData,
  initStore,
  listUsers,
  saveUserData,
  storageMode,
  updateUserName,
  emptyData,
  userUploadDir,
} from './store.js'
import { mailConfigured, sendMail } from './mail.js'
import { buildMonthlyReport, sendMonthlyReports } from './report.js'
import { scheduleSrs } from '../src/lib/srs.js'
import { computePublicStats } from './publicStats.js'
import {
  getQualityDistractors,
  getWordbankMeta,
  loadWordbank,
  queryWordbank,
} from './wordbank.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'rota-dev-secret-change-in-production'
const CRON_SECRET = process.env.CRON_SECRET || ''
const isProd = process.env.NODE_ENV === 'production'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

function uid() {
  return crypto.randomBytes(12).toString('hex')
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    shareCode: user.shareCode || null,
    createdAt: user.createdAt,
  }
}

async function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Giriş gerekli' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await findUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'Oturum geçersiz' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Oturum süresi dolmuş' })
  }
}

function cronAuth(req, res, next) {
  if (!CRON_SECRET) {
    return res.status(503).json({ error: 'CRON_SECRET tanımlı değil' })
  }
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.secret
  if (token !== CRON_SECRET) {
    return res.status(401).json({ error: 'Yetkisiz' })
  }
  next()
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, userUploadDir(req.user.id))
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-()\sşŞıİğĞüÜöÖçÇ]/gi, '_').slice(0, 80)
      cb(null, `${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
})

app.get('/api/health', (_req, res) => {
  let wordbank = null
  try {
    wordbank = getWordbankMeta()
  } catch {
    wordbank = { total: 0, error: true }
  }
  res.json({
    ok: true,
    storage: storageMode(),
    mail: mailConfigured(),
    wordbank,
  })
})

app.get('/api/wordbank/meta', auth, (_req, res) => {
  try {
    res.json(getWordbankMeta())
  } catch (err) {
    res.status(500).json({ error: err.message || 'Kelime havuzu yok' })
  }
})

app.get('/api/wordbank', auth, async (req, res) => {
  try {
    const data = await getUserData(req.user.id)
    const result = queryWordbank({
      offset: req.query.offset,
      limit: req.query.limit,
      q: req.query.q,
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      qualityOnly: req.query.qualityOnly,
      progress: data.wordbankProgress || {},
    })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Kelime havuzu okunamadı' })
  }
})

app.get('/api/wordbank/distractors', auth, (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
    const n = Math.min(6, Math.max(1, Number(req.query.n) || 3))
    res.json({ meanings: getQualityDistractors(exclude, n) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Distractör alınamadı' })
  }
})


app.put('/api/wordbank/progress', auth, async (req, res) => {
  try {
    const { id, status } = req.body || {}
    if (!id || !['known', 'learning', 'hard', 'new'].includes(status)) {
      return res.status(400).json({ error: 'id ve geçerli status gerekli' })
    }
    const data = await getUserData(req.user.id)
    const progress = { ...(data.wordbankProgress || {}) }
    const srs = { ...(data.srs || {}) }
    if (status === 'new') {
      delete progress[id]
      delete srs[id]
    } else {
      progress[id] = status
      srs[id] = scheduleSrs(srs[id], status)
    }
    const next = await saveUserData(
      req.user.id,
      { ...data, wordbankProgress: progress, srs },
      { replaceProgress: true },
    )
    res.json({
      id,
      status: progress[id] || 'new',
      wordbankProgress: next.wordbankProgress,
      srs: next.srs,
      card: srs[id] || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'İlerleme kaydedilemedi' })
  }
})

app.get('/api/me/share', auth, async (req, res) => {
  try {
    const code = await ensureShareCode(req.user.id)
    res.json({ shareCode: code })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Kod alınamadı' })
  }
})

app.get('/api/public/:code', async (req, res) => {
  try {
    const user = await findUserByShareCode(req.params.code)
    if (!user) return res.status(404).json({ error: 'Kod bulunamadı' })
    const data = await getUserData(user.id)
    res.json({
      name: user.name,
      shareCode: user.shareCode,
      stats: computePublicStats(data),
    })
  } catch (err) {
    res.status(500).json({ error: 'Profil alınamadı' })
  }
})

app.post('/api/reminders/email', auth, async (req, res) => {
  try {
    if (!mailConfigured()) {
      return res.status(503).json({ error: 'SMTP ayarlı değil' })
    }
    const data = await getUserData(req.user.id)
    const stats = computePublicStats(data)
    const custom = data.settings?.studyReminder?.trim()
    await sendMail({
      to: req.user.email,
      subject: 'Rota — çalışma hatırlatması',
      text: [
        `Merhaba ${req.user.name},`,
        '',
        custom || 'Bugün kısa bir çalışma için iyi bir an.',
        `Serin: ${stats.streak} gün · Bu hafta: ${stats.weekMinutes} dk · Havuz: ${stats.wordbankKnown} kelime`,
        '',
        '— Rota',
      ].join('\n'),
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Hatırlatma gönderilemedi' })
  }
})



app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre gerekli' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' })
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createUser({
      id: uid(),
      name,
      email,
      passwordHash,
    })

    if (storageMode() === 'file') {
      await saveUserData(user.id, emptyData(), { replaceFiles: true })
    }

    const token = signToken(user)
    res.status(201).json({ token, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Kayıt başarısız' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli' })
    }

    const user = await findUserByEmail(email)
    if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'E-posta veya şifre hatalı' })

    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Giriş başarısız' })
  }
})

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.patch('/api/auth/me', auth, async (req, res) => {
  try {
    const { name } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'Ad gerekli' })
    const user = await updateUserName(req.user.id, name)
    res.json({ user: publicUser(user) })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Güncellenemedi' })
  }
})

app.get('/api/data', auth, async (req, res) => {
  try {
    res.json(await getUserData(req.user.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Veriler alınamadı' })
  }
})

app.put('/api/data', auth, async (req, res) => {
  try {
    const next = await saveUserData(req.user.id, req.body || {})
    res.json(next)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Kayıt başarısız' })
  }
})

app.get('/api/files', auth, async (req, res) => {
  try {
    const data = await getUserData(req.user.id)
    res.json({ files: data.files || [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Dosyalar alınamadı' })
  }
})

app.post('/api/files', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi' })

    const data = await getUserData(req.user.id)
    const entry = {
      id: uid(),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mime: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    }
    const next = {
      ...data,
      files: [entry, ...(data.files || [])],
    }
    await saveUserData(req.user.id, next, { replaceFiles: true })
    res.status(201).json({ file: entry, files: next.files })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Yükleme başarısız' })
  }
})

app.get('/api/files/:id/download', auth, async (req, res) => {
  try {
    const data = await getUserData(req.user.id)
    const file = (data.files || []).find((f) => f.id === req.params.id)
    if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' })

    const full = path.join(userUploadDir(req.user.id), file.storedName)
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Dosya diskte yok' })

    res.download(full, file.originalName)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'İndirme başarısız' })
  }
})

app.delete('/api/files/:id', auth, async (req, res) => {
  try {
    const data = await getUserData(req.user.id)
    const file = (data.files || []).find((f) => f.id === req.params.id)
    if (!file) return res.status(404).json({ error: 'Dosya bulunamadı' })

    const full = path.join(userUploadDir(req.user.id), file.storedName)
    if (fs.existsSync(full)) fs.unlinkSync(full)

    const next = {
      ...data,
      files: (data.files || []).filter((f) => f.id !== req.params.id),
    }
    await saveUserData(req.user.id, next, { replaceFiles: true })
    res.json({ files: next.files })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Silme başarısız' })
  }
})

app.get('/api/reports/previous-month', auth, async (req, res) => {
  try {
    const data = await getUserData(req.user.id)
    const report = buildMonthlyReport(req.user, data)
    res.json({ summary: report.summary, subject: report.subject, text: report.text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Rapor oluşturulamadı' })
  }
})

app.post('/api/reports/send-test', auth, async (req, res) => {
  try {
    if (!mailConfigured()) {
      return res.status(503).json({
        error: 'E-posta ayarlı değil. SMTP_HOST, SMTP_USER, SMTP_PASS ekle.',
      })
    }
    const data = await getUserData(req.user.id)
    const report = buildMonthlyReport(req.user, data)
    await sendMail({
      to: req.user.email,
      subject: `[Test] ${report.subject}`,
      text: report.text,
      html: report.html,
    })
    res.json({ ok: true, to: req.user.email, summary: report.summary })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Mail gönderilemedi' })
  }
})

app.post('/api/cron/monthly-report', cronAuth, async (_req, res) => {
  try {
    if (!mailConfigured()) {
      return res.status(503).json({ error: 'SMTP ayarları eksik' })
    }
    const results = await sendMonthlyReports({ listUsers, getUserData, sendMail })
    res.json({ ok: true, count: results.length, results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Cron başarısız' })
  }
})

if (isProd) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

async function start() {
  await initStore()
  try {
    const wb = loadWordbank()
    console.log(`Wordbank: ${wb.total} words (${wb.seeded} seeded)`)
  } catch (err) {
    console.warn('Wordbank load warning:', err.message)
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rota ${isProd ? 'production' : 'API'} http://0.0.0.0:${PORT}`)
    console.log(`Storage: ${storageMode()} | Mail: ${mailConfigured() ? 'on' : 'off'}`)
  })
}

start().catch((err) => {
  console.error('Server failed to start', err)
  process.exit(1)
})
