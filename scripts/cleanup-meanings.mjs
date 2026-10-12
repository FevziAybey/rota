/**
 * Clean obviously bad machine translations in top ranks; keep good seeded glosses.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bankFile = path.join(__dirname, '..', 'server', 'data', 'wordbank.json')
const metaFile = path.join(__dirname, '..', 'server', 'data', 'wordbank-meta.json')

const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8'))
let cleaned = 0

function looksBad(word, meaning) {
  if (!meaning) return true
  if (meaning.startsWith('Sık kullanılan')) return false // placeholder ok for lower ranks
  if (meaning.startsWith('(')) return true
  // Entire sentence / URL-ish MT garbage
  if (meaning.length > 48) return true
  if (/https?:|www\.|Buraya|tıklay|görebilirsiniz|click here/i.test(meaning)) return true
  // Single-letter / junk English tokens with absurd TR
  if (word.length <= 2 && meaning.length > 12) return true
  return false
}

for (const entry of bank) {
  if (!looksBad(entry.word, entry.meaningTr)) continue
  // Keep authentic manual seeds from original builder when clearly short glosses
  if (entry.seeded && entry.meaningTr && entry.meaningTr.length <= 40 && !looksBad(entry.word, entry.meaningTr)) {
    continue
  }
  if (entry.rank <= 3000) {
    entry.meaningTr = `Sık kullanılan İngilizce kelime (#${entry.rank})`
    entry.seeded = false
    cleaned += 1
  }
}

fs.writeFileSync(bankFile, JSON.stringify(bank))
const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
meta.seeded = bank.filter(
  (w) => w.seeded && !String(w.meaningTr).startsWith('Sık kullanılan'),
).length
meta.cleanedAt = new Date().toISOString()
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
console.log({ cleaned, seeded: meta.seeded, total: bank.length })
