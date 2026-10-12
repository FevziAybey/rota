import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

const usePg = Boolean(process.env.DATABASE_URL)
let pool = null

export function emptyData() {
  return {
    studySessions: [],
    vocabulary: [],
    goals: [],
    notes: [],
    files: [],
    wordbankProgress: {},
    srs: {},
    badges: [],
    friends: [],
    questLog: [],
    settings: {
      dailyTarget: 30,
      dailyWordsTarget: 15,
      monthlyReport: true,
      emailReminder: false,
      studyReminder: '',
      onboardingDismissed: false,
      wordbankBand: '1-1000',
      placementDone: false,
    },
  }
}

function normalizeProgress(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === 'known' || value === 'learning' || value === 'hard') {
      next[key] = value
    }
  }
  return next
}

function normalizeSrs(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    next[key] = {
      status: ['known', 'learning', 'hard'].includes(value.status)
        ? value.status
        : 'learning',
      ease: Number(value.ease) || 2.3,
      interval: Number(value.interval) || 0,
      repetitions: Number(value.repetitions) || 0,
      due: typeof value.due === 'string' ? value.due : '',
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    }
  }
  return next
}

function normalizeData(raw = {}) {
  const base = emptyData()
  return {
    studySessions: Array.isArray(raw.studySessions) ? raw.studySessions : [],
    vocabulary: Array.isArray(raw.vocabulary) ? raw.vocabulary : [],
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    files: Array.isArray(raw.files) ? raw.files : [],
    wordbankProgress: normalizeProgress(raw.wordbankProgress),
    srs: normalizeSrs(raw.srs),
    badges: Array.isArray(raw.badges) ? raw.badges.filter((b) => typeof b === 'string') : [],
    friends: Array.isArray(raw.friends)
      ? raw.friends
          .filter((f) => f && typeof f.code === 'string')
          .map((f) => ({
            code: f.code,
            name: f.name || 'Arkadaş',
            addedAt: f.addedAt || new Date().toISOString(),
          }))
      : [],
    questLog: Array.isArray(raw.questLog)
      ? raw.questLog.filter((q) => q && typeof q.date === 'string')
      : [],
    settings: {
      dailyTarget: Number(raw.settings?.dailyTarget) || base.settings.dailyTarget,
      dailyWordsTarget:
        Number(raw.settings?.dailyWordsTarget) || base.settings.dailyWordsTarget,
      monthlyReport:
        raw.settings?.monthlyReport === undefined
          ? true
          : Boolean(raw.settings.monthlyReport),
      emailReminder: Boolean(raw.settings?.emailReminder),
      studyReminder:
        typeof raw.settings?.studyReminder === 'string'
          ? raw.settings.studyReminder
          : '',
      onboardingDismissed: Boolean(raw.settings?.onboardingDismissed),
      wordbankBand:
        typeof raw.settings?.wordbankBand === 'string'
          ? raw.settings.wordbankBand
          : '1-1000',
      placementDone: Boolean(raw.settings?.placementDone),
    },
  }
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8')
}

function readJson(file, fallback) {
  ensureDir()
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureDir()
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

async function initPg() {
  if (!usePg || pool) return
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      share_code TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;
  `).catch(() => {})


  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `)
}

export async function initStore() {
  if (usePg) await initPg()
  else ensureDir()
  ensureDir()
}

export function userUploadDir(userId) {
  const dir = path.join(UPLOADS_DIR, userId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function makeShareCode() {
  return `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function mapUserRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash || row.password_hash,
    shareCode: row.shareCode || row.share_code || null,
    createdAt: row.createdAt || row.created_at,
  }
}

export async function listUsers() {
  if (usePg) {
    await initPg()
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash AS "passwordHash", share_code AS "shareCode", created_at AS "createdAt" FROM users ORDER BY created_at ASC',
    )
    return rows.map(mapUserRow)
  }
  return readJson(USERS_FILE, [])
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase()
  if (usePg) {
    await initPg()
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash AS "passwordHash", share_code AS "shareCode", created_at AS "createdAt" FROM users WHERE email = $1',
      [normalized],
    )
    return mapUserRow(rows[0])
  }
  return readJson(USERS_FILE, []).find((u) => u.email === normalized) || null
}

export async function findUserById(id) {
  if (usePg) {
    await initPg()
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash AS "passwordHash", share_code AS "shareCode", created_at AS "createdAt" FROM users WHERE id = $1',
      [id],
    )
    return mapUserRow(rows[0])
  }
  return readJson(USERS_FILE, []).find((u) => u.id === id) || null
}

export async function findUserByShareCode(code) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null
  if (usePg) {
    await initPg()
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash AS "passwordHash", share_code AS "shareCode", created_at AS "createdAt" FROM users WHERE UPPER(share_code) = $1',
      [normalized],
    )
    return mapUserRow(rows[0])
  }
  return (
    readJson(USERS_FILE, []).find(
      (u) => String(u.shareCode || '').toUpperCase() === normalized,
    ) || null
  )
}

export async function ensureShareCode(userId) {
  const user = await findUserById(userId)
  if (!user) return null
  if (user.shareCode) return user.shareCode
  const code = makeShareCode()
  if (usePg) {
    await initPg()
    await pool.query('UPDATE users SET share_code = $1 WHERE id = $2', [code, userId])
  } else {
    const users = readJson(USERS_FILE, [])
    const idx = users.findIndex((u) => u.id === userId)
    if (idx >= 0) {
      users[idx].shareCode = code
      writeJson(USERS_FILE, users)
    }
  }
  return code
}

export async function createUser({ id, name, email, passwordHash }) {
  const user = {
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    shareCode: makeShareCode(),
    createdAt: new Date().toISOString(),
  }

  if (usePg) {
    await initPg()
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, share_code, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, user.name, user.email, user.passwordHash, user.shareCode, user.createdAt],
    )
    await pool.query(
      'INSERT INTO user_data (user_id, payload) VALUES ($1, $2::jsonb)',
      [user.id, JSON.stringify(emptyData())],
    )
  } else {
    const users = readJson(USERS_FILE, [])
    users.push(user)
    writeJson(USERS_FILE, users)
    writeJson(path.join(DATA_DIR, `user-${user.id}.json`), emptyData())
  }

  userUploadDir(user.id)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    shareCode: user.shareCode,
    createdAt: user.createdAt,
  }
}

export async function updateUserName(userId, name) {
  const nextName = name.trim()
  if (!nextName) throw new Error('Ad gerekli')

  if (usePg) {
    await initPg()
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [nextName, userId])
  } else {
    const users = readJson(USERS_FILE, [])
    const idx = users.findIndex((u) => u.id === userId)
    if (idx === -1) throw new Error('Kullanıcı bulunamadı')
    users[idx].name = nextName
    writeJson(USERS_FILE, users)
  }

  return findUserById(userId)
}

export async function getUserData(userId) {
  if (usePg) {
    await initPg()
    const { rows } = await pool.query(
      'SELECT payload FROM user_data WHERE user_id = $1',
      [userId],
    )
    return normalizeData(rows[0]?.payload || emptyData())
  }
  return normalizeData(
    readJson(path.join(DATA_DIR, `user-${userId}.json`), emptyData()),
  )
}

export async function saveUserData(
  userId,
  data,
  { replaceFiles = false, replaceProgress = false } = {},
) {
  const current = await getUserData(userId)
  const next = normalizeData(data)
  if (!replaceFiles && !Array.isArray(data?.files)) {
    next.files = current.files
  }
  if (!replaceProgress && data?.wordbankProgress === undefined) {
    next.wordbankProgress = current.wordbankProgress
  }
  if (data?.srs === undefined) {
    next.srs = current.srs
  }
  if (usePg) {
    await initPg()
    await pool.query(
      `INSERT INTO user_data (user_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [userId, JSON.stringify(next)],
    )
  } else {
    writeJson(path.join(DATA_DIR, `user-${userId}.json`), next)
  }
  return next
}

export function storageMode() {
  return usePg ? 'postgres' : 'file'
}
