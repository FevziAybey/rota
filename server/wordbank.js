import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BANK_FILE = path.join(__dirname, 'data', 'wordbank.json')
const META_FILE = path.join(__dirname, 'data', 'wordbank-meta.json')

let bank = null
let meta = null

export function isQualityMeaning(meaning) {
  const m = String(meaning || '').trim()
  if (!m) return false
  if (m.startsWith('Sık kullanılan')) return false
  if (m.startsWith('(')) return false
  if (m.includes('bağlamda öğren')) return false
  if (m.includes('yaygın İngilizce sözcük')) return false
  if (/İngilizce kelime\s*\(sıra/.test(m)) return false
  return true
}

export function loadWordbank({ force = false } = {}) {
  if (bank && !force) {
    const quality = bank.filter((w) => w.seeded && isQualityMeaning(w.meaningTr)).length
    return { total: bank.length, seeded: quality }
  }
  if (!fs.existsSync(BANK_FILE)) {
    throw new Error('wordbank.json bulunamadı. Önce: npm run wordbank:build')
  }
  bank = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'))
  meta = fs.existsSync(META_FILE)
    ? JSON.parse(fs.readFileSync(META_FILE, 'utf8'))
    : { total: bank.length, bands: [] }
  const quality = bank.filter((w) => w.seeded && isQualityMeaning(w.meaningTr)).length
  return { total: bank.length, seeded: quality }
}

export function getWordbankMeta() {
  if (!bank) loadWordbank()
  const quality = bank.filter((w) => w.seeded && isQualityMeaning(w.meaningTr)).length
  return {
    total: bank.length,
    seeded: quality,
    quality,
    bands: meta?.bands || [],
    generatedAt: meta?.generatedAt || null,
  }
}

export function getQualityDistractors(excludeId, n = 3) {
  if (!bank) loadWordbank()
  const pool = bank.filter(
    (w) => w.id !== excludeId && w.seeded && isQualityMeaning(w.meaningTr),
  )
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const seen = new Set()
  const out = []
  for (const w of pool) {
    if (seen.has(w.meaningTr)) continue
    seen.add(w.meaningTr)
    out.push(w.meaningTr)
    if (out.length >= n) break
  }
  return out
}


export function queryWordbank({
  offset = 0,
  limit = 50,
  q = '',
  from = 1,
  to = 10000,
  status,
  progress = {},
  qualityOnly = false,
} = {}) {
  if (!bank) loadWordbank()

  const startRank = Math.max(1, Number(from) || 1)
  const endRank = Math.min(bank.length, Number(to) || bank.length)
  const query = String(q || '').trim().toLowerCase()
  const off = Math.max(0, Number(offset) || 0)
  const lim = Math.min(100, Math.max(1, Number(limit) || 50))

  let rows = bank.filter((w) => w.rank >= startRank && w.rank <= endRank)

  if (qualityOnly === true || qualityOnly === '1' || qualityOnly === 'true') {
    rows = rows.filter((w) => w.seeded && isQualityMeaning(w.meaningTr))
  }


  if (query) {
    rows = rows.filter(
      (w) =>
        w.word.includes(query) ||
        w.meaningTr.toLowerCase().includes(query) ||
        w.example.toLowerCase().includes(query),
    )
  }

  if (status === 'known' || status === 'learning' || status === 'hard' || status === 'new') {
    rows = rows.filter((w) => {
      const st = progress[w.id]
      if (status === 'new') return !st
      return st === status
    })
  }

  const total = rows.length
  const items = rows.slice(off, off + lim).map((w) => ({
    ...w,
    status: progress[w.id] || 'new',
  }))

  return { total, offset: off, limit: lim, items }
}

export function getWordById(id) {
  if (!bank) loadWordbank()
  return bank.find((w) => w.id === id) || null
}
