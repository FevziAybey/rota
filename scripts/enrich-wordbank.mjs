/**
 * Enriches top N wordbank meanings via MyMemory (cached).
 * Run: node scripts/enrich-wordbank.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bankFile = path.join(root, 'server', 'data', 'wordbank.json')
const metaFile = path.join(root, 'server', 'data', 'wordbank-meta.json')
const cacheFile = path.join(__dirname, 'meanings-cache.json')

const TOP = Number(process.env.ENRICH_TOP || 1500)
const DELAY = Number(process.env.ENRICH_DELAY || 120)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translate(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|tr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const text = json?.responseData?.translatedText?.trim()
  if (!text || text.toLowerCase() === word.toLowerCase()) return null
  return text
}

async function main() {
  const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8'))
  const cache = fs.existsSync(cacheFile)
    ? JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    : {}
  const gCacheFile = path.join(__dirname, '.wordbank-cache.json')
  if (fs.existsSync(gCacheFile)) {
    Object.assign(cache, JSON.parse(fs.readFileSync(gCacheFile, 'utf8')))
  }

  let updated = 0
  for (let i = 0; i < Math.min(TOP, bank.length); i += 1) {
    const entry = bank[i]
    if (
      entry.seeded &&
      entry.meaningTr &&
      !entry.meaningTr.startsWith('Sık kullanılan') &&
      !entry.meaningTr.startsWith('(')
    ) {
      continue
    }
    if (cache[entry.word] && !String(cache[entry.word]).startsWith('(')) {
      entry.meaningTr = cache[entry.word]
      entry.seeded = true
      updated += 1
      continue
    }
    try {
      const meaning = await translate(entry.word)
      await sleep(DELAY)
      if (meaning) {
        cache[entry.word] = meaning
        entry.meaningTr = meaning
        entry.seeded = true
        updated += 1
        if (updated % 25 === 0) {
          fs.writeFileSync(cacheFile, JSON.stringify(cache))
          console.log(`enriched ${updated} @ rank ${entry.rank}`)
        }
      }
    } catch (err) {
      console.warn(`skip ${entry.word}: ${err.message}`)
      await sleep(DELAY * 2)
    }
  }

  fs.writeFileSync(cacheFile, JSON.stringify(cache))
  fs.writeFileSync(bankFile, JSON.stringify(bank))
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  meta.seeded = bank.filter((w) => w.seeded).length
  meta.enrichedAt = new Date().toISOString()
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  console.log(`Done. seeded=${meta.seeded} updated=${updated}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
