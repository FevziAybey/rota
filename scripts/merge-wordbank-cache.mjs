/**
 * Merge Google/MyMemory translation caches into wordbank.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bankFile = path.join(root, 'server', 'data', 'wordbank.json')
const metaFile = path.join(root, 'server', 'data', 'wordbank-meta.json')

const caches = [
  path.join(__dirname, '.wordbank-cache.json'),
  path.join(__dirname, 'meanings-cache.json'),
]

function isPlaceholder(meaning) {
  if (!meaning) return true
  if (meaning.startsWith('(')) return true
  if (meaning.startsWith('Sık kullanılan')) return true
  return false
}

function isBadMeaning(meaning) {
  if (!meaning) return true
  if (isPlaceholder(meaning)) return true
  if (meaning.length > 48) return true
  if (/https?:|www\.|Buraya|tıklay|görebilirsiniz|click here/i.test(meaning)) return true
  return false
}

function loadCaches() {
  const map = {}
  for (const file of caches) {
    if (!fs.existsSync(file)) continue
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const [k, v] of Object.entries(raw)) {
      const text = String(v).trim()
      if (!text || isBadMeaning(text)) continue
      map[k.toLowerCase()] = text
    }
  }
  return map
}

const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8'))
const map = loadCaches()
let updated = 0

for (const entry of bank) {
  const hit = map[entry.word]
  if (!hit) continue
  if (!isPlaceholder(entry.meaningTr) && entry.seeded) continue
  if (entry.meaningTr === hit) continue
  entry.meaningTr = hit
  entry.seeded = true
  updated += 1
}

fs.writeFileSync(bankFile, JSON.stringify(bank))
const meta = fs.existsSync(metaFile)
  ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  : { total: bank.length }
meta.total = bank.length
meta.seeded = bank.filter((w) => w.seeded && !isPlaceholder(w.meaningTr)).length
meta.mergedAt = new Date().toISOString()
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))

console.log(
  JSON.stringify(
    {
      total: bank.length,
      seeded: meta.seeded,
      updated,
      cacheKeys: Object.keys(map).length,
    },
    null,
    2,
  ),
)
