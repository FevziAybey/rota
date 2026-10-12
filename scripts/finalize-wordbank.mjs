/**
 * Finalize wordbank from cache + MyMemory for remaining words.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const listPath = path.join(__dirname, 'google-10000.txt')
const cachePath = path.join(__dirname, '.wordbank-cache.json')
const outPath = path.join(root, 'server', 'data', 'wordbank.json')
const metaPath = path.join(root, 'server', 'data', 'wordbank-meta.json')
const chunkDir = path.join(root, 'src', 'data', 'wordbank')

const EXAMPLE_TEMPLATES = [
  (w) => `I try to use "${w}" in real conversations.`,
  (w) => `This sentence shows a common use of "${w}".`,
  (w) => `You will often see "${w}" in everyday English.`,
  (w) => `She learned the word "${w}" while studying today.`,
  (w) => `Can you explain "${w}" with a simple example?`,
]

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
}

async function myMemory(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|tr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const text = json?.responseData?.translatedText?.trim()?.replace(/&#\d+;/g, '')
  if (!text || text.toLowerCase() === word.toLowerCase()) return null
  return text
}

async function main() {
  const words = fs
    .readFileSync(listPath, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)

  const unique = []
  const seen = new Set()
  for (const w of words) {
    if (seen.has(w)) continue
    seen.add(w)
    unique.push(w)
  }

  const cache = loadCache()
  const missing = unique.filter((w) => !cache[w] || cache[w] === `(${w})`)
  console.log(`Total ${unique.length}, missing/weak ${missing.length}, cached ${Object.keys(cache).length}`)

  let filled = 0
  for (let i = 0; i < missing.length; i += 1) {
    const word = missing[i]
    try {
      const text = await myMemory(word)
      if (text) {
        cache[word] = text
        filled += 1
      } else {
        cache[word] = cache[word] || `(${word})`
      }
    } catch (err) {
      console.warn(`MM fail ${word}: ${err.message}`)
      cache[word] = cache[word] || `(${word})`
    }
    if ((i + 1) % 25 === 0) {
      saveCache(cache)
      console.log(`MyMemory ${i + 1}/${missing.length} (filled ${filled})`)
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  saveCache(cache)

  const entries = unique.map((word, idx) => {
    const rank = idx + 1
    const id = `w${String(rank).padStart(5, '0')}`
    const meaningTr = cache[word] || `(${word})`
    const example = EXAMPLE_TEMPLATES[idx % EXAMPLE_TEMPLATES.length](word)
    return { id, rank, word, meaningTr, example }
  })

  const withReal = entries.filter((e) => !e.meaningTr.startsWith('(')).length

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(entries), 'utf8')
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        total: entries.length,
        withMeaning: withReal,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  )

  fs.mkdirSync(chunkDir, { recursive: true })
  for (let i = 0; i < entries.length; i += 1000) {
    const chunk = entries.slice(i, i + 1000)
    const n = Math.floor(i / 1000) + 1
    fs.writeFileSync(path.join(chunkDir, `chunk-${n}.json`), JSON.stringify(chunk), 'utf8')
  }

  console.log(`Wrote ${entries.length} (meanings: ${withReal}) → ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
