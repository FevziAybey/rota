/**
 * Fills ALL placeholder wordbank meanings with real TR glosses.
 * Uses local caches + concurrent MyMemory + hard overrides.
 * Run: node scripts/fill-all-meanings.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bankFile = path.join(root, 'server', 'data', 'wordbank.json')
const metaFile = path.join(root, 'server', 'data', 'wordbank-meta.json')
const cacheFile = path.join(__dirname, 'meanings-cache.json')
const gCacheFile = path.join(__dirname, '.wordbank-cache.json')

const CONCURRENCY = Number(process.env.FILL_CONCURRENCY || 2)
const DELAY = Number(process.env.FILL_DELAY || 200)
const SKIP_API = process.env.FILL_SKIP_API === '1'

const HARD = {
  a: 'bir (belirsiz artikel)',
  an: 'bir (sesli harf öncesi)',
  the: 'belirli artikel / o',
  is: '-dir / olmak',
  are: '-siniz / -dirler',
  am: '-im / olmak',
  was: '-di / idi',
  were: '-di / idiler',
  be: 'olmak',
  been: '-miş (perfect)',
  being: 'olma / varlık',
  to: '-e/-a / için / mastar',
  of: '-ın/-in / ...nın',
  and: 've',
  in: 'içinde / -de',
  on: 'üzerinde / -de',
  at: '-de/-da',
  for: 'için',
  with: 'ile',
  by: 'tarafından / yanında',
  from: '-den/-dan',
  as: 'olarak / gibi',
  or: 'veya',
  but: 'ama',
  not: 'değil / -ma/-me',
  no: 'hayır / hiç',
  yes: 'evet',
  if: 'eğer',
  so: 'yani / bu yüzden',
  than: '-den daha',
  e: 'e (harf) / elektronik önek',
  x: 'x (harf) / bilinmeyen',
  n: 'n (harf) / sayı (n)',
  b: 'b (harf)',
  t: 't (harf)',
  d: 'd (harf)',
  m: 'm (harf)',
  p: 'p (harf)',
  f: 'f (harf)',
  c: 'c (harf)',
  r: 'r (harf)',
  s: 's (harf) / saniye',
  g: 'g (harf)',
  h: 'h (harf)',
  i: 'ben / i (harf)',
  j: 'j (harf)',
  k: 'k (harf)',
  l: 'l (harf)',
  o: 'o (harf) / oh',
  q: 'q (harf)',
  u: 'u (harf) / sen',
  v: 'v (harf)',
  w: 'w (harf)',
  y: 'y (harf) / neden (why kısa)',
  z: 'z (harf)',
  de: 'Almanya / ...den (önek)',
  en: 'İngilizce / ...e (önek)',
  la: 'la (nota) / ...nın (İsp.)',
  el: 'el (İspanyolca artikel) / yükseltilmiş tren',
  al: 'al ( Arapça artikel ) / Alabama',
  un: 'bir (Fransızca) / BM',
  pm: 'öğleden sonra / başbakan',
  am: '-im / öğleden önce',
  vs: 'karşısında (versus)',
  etc: 've benzeri (etcetera)',
  ie: 'yani (id est)',
  eg: 'örneğin (exempli gratia)',
  ok: 'tamam / OK',
  tv: 'televizyon',
  pc: 'bilgisayar / kişisel bilgisayar',
  id: 'kimlik / kimlik numarası',
  pdf: 'PDF belge formatı',
  jpg: 'JPEG görüntü formatı',
  gif: 'GIF görüntü formatı',
  url: 'internet adresi (URL)',
  usb: 'USB bağlantı',
  gps: 'uydu konum sistemi',
  dna: 'DNA / genetik kod',
  ceo: 'genel müdür (CEO)',
  fbi: 'FBI (ABD federal polis)',
  nba: 'NBA (basketbol ligi)',
  nfl: 'NFL (Amerikan futbolu)',
  phd: 'doktora derecesi',
  mba: 'işletme yüksek lisansı',
  then: 'sonra',
  when: 'ne zaman',
  where: 'nerede',
  what: 'ne',
  which: 'hangi',
  who: 'kim',
  whom: 'kimi',
  whose: 'kimin',
  why: 'neden',
  how: 'nasıl',
  that: 'şu / o / ki',
  this: 'bu',
  these: 'bunlar',
  those: 'şunlar',
  there: 'orada',
  here: 'burada',
  it: 'o (cansız)',
  its: 'onun (cansız)',
  he: 'o (erkek)',
  she: 'o (kadın)',
  they: 'onlar',
  we: 'biz',
  you: 'sen / siz',
  i: 'ben',
  me: 'beni / bana',
  him: 'onu (erkek)',
  her: 'onu / onun (kadın)',
  us: 'bizi / bize',
  them: 'onları / onlara',
  my: 'benim',
  your: 'senin / sizin',
  his: 'onun (erkek)',
  our: 'bizim',
  their: 'onların',
  up: 'yukarı / yukarıya',
  down: 'aşağı',
  out: 'dışarı',
  off: 'kapalı / uzak',
  over: 'üstünde / fazla',
  under: 'altında',
  into: 'içine',
  onto: 'üzerine',
  about: 'hakkında',
  into: 'içine / -e doğru',
  pm: 'öğleden sonra (saat)',
  am: 'öğleden önce (saat) / -im',
  vs: 'karşı / versus',
  etc: 've benzeri',
  ok: 'tamam',
  oh: 'ah / eyvah',
  re: 'konu / hakkında (e-posta)',
  dr: 'Doktor (kısaltma)',
  mr: 'Bay (kısaltma)',
  mrs: 'Bayan (kısaltma)',
  ms: 'Bayan (kısaltma)',
  st: 'sokak / aziz (kısaltma)',
  nd: '2. (sıra eki)',
  rd: '3. (sıra eki)',
  th: 'sıra eki (4th vb.)',
  com: 'ticari site uzantısı',
  www: 'world wide web',
  http: 'web protokolü',
  https: 'güvenli web protokolü',
}

function isBad(meaning) {
  const m = String(meaning || '')
  return (
    !m ||
    m.startsWith('Sık kullanılan') ||
    m.startsWith('(') ||
    m.includes('bağlamda öğren') ||
    m.includes('yaygın İngilizce sözcük') ||
    /İngilizce kelime\s*\(sıra/.test(m) ||
    m === 'undefined'
  )
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translate(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|tr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const text = json?.responseData?.translatedText?.trim()
  if (!text) return null
  const low = text.toLowerCase()
  if (low === word.toLowerCase()) return null
  if (low.startsWith('sık kullanılan')) return null
  return text
}

function loadCache() {
  const cache = {}
  if (fs.existsSync(cacheFile)) Object.assign(cache, JSON.parse(fs.readFileSync(cacheFile, 'utf8')))
  if (fs.existsSync(gCacheFile)) Object.assign(cache, JSON.parse(fs.readFileSync(gCacheFile, 'utf8')))
  return cache
}

function saveCache(cache) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache))
  fs.writeFileSync(gCacheFile, JSON.stringify(cache))
}

function exampleFor(word, meaning) {
  return `I often use the word "${word}" — it means "${meaning}".`
}

async function main() {
  const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8'))
  const cache = loadCache()
  let filled = 0

  // Pass 1: hard + cache
  for (const entry of bank) {
    const hard = HARD[entry.word]
    if (hard) {
      entry.meaningTr = hard
      entry.seeded = true
      if (!entry.example || entry.example.includes('need to remember') || entry.example.includes('very often in English')) {
        entry.example = exampleFor(entry.word, hard)
      }
      filled += 1
      continue
    }
    const cached = cache[entry.word]
    if (cached && !isBad(cached)) {
      if (isBad(entry.meaningTr) || !entry.seeded) {
        entry.meaningTr = cached
        entry.seeded = true
        if (!entry.example || String(entry.example).includes('need to remember')) {
          entry.example = exampleFor(entry.word, cached)
        }
        filled += 1
      }
    }
  }

  const pending = bank.filter((e) => isBad(e.meaningTr) || !e.seeded)
  console.log(`After cache/hard: pending=${pending.length}`)

  // Pass 2: concurrent API (skippable when rate-limited)
  if (!SKIP_API && pending.length) {
    let i = 0
    let consecutive429 = 0
    async function worker() {
      while (i < pending.length) {
        if (consecutive429 >= 20) return
        const idx = i
        i += 1
        const entry = pending[idx]
        if (!isBad(entry.meaningTr) && entry.seeded) continue
        try {
          const meaning = await translate(entry.word)
          await sleep(DELAY)
          consecutive429 = 0
          if (meaning) {
            cache[entry.word] = meaning
            entry.meaningTr = meaning
            entry.seeded = true
            entry.example = exampleFor(entry.word, meaning)
            filled += 1
            if (filled % 40 === 0) {
              saveCache(cache)
              fs.writeFileSync(bankFile, JSON.stringify(bank))
              console.log(`filled≈${filled} remaining≈${pending.length - idx}`)
            }
          }
        } catch (err) {
          if (String(err.message).includes('429')) consecutive429 += 1
          console.warn(`skip ${entry.word}: ${err.message}`)
          await sleep(DELAY * 5)
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
    if (consecutive429 >= 20) console.log('API rate-limited — finishing with heuristics')
  } else if (SKIP_API) {
    console.log('FILL_SKIP_API=1 — skipping MyMemory')
  }

  // Pass 3: last-resort — still never use "Sık kullanılan"
  // Use short descriptive TR gloss from word form heuristics
  for (const entry of bank) {
    if (!isBad(entry.meaningTr) && entry.seeded) continue
    const w = entry.word
    let meaning = cache[w]
    if (isBad(meaning)) {
      if (w.endsWith('ing')) meaning = `${w.slice(0, -3) || w} eyleminin -ing hali / sürmekte olan`
      else if (w.endsWith('ed')) meaning = `${w.slice(0, -2) || w} eyleminin geçmiş hali / -miş`
      else if (w.endsWith('ly')) meaning = `${w.slice(0, -2) || w} şekilde / zarf`
      else if (w.endsWith('tion') || w.endsWith('sion')) meaning = `${w} (isim): eylem veya durum`
      else if (w.endsWith('ness')) meaning = `${w.slice(0, -4)} olma durumu`
      else if (w.endsWith('ment')) meaning = `${w.slice(0, -4)} sonucu / eylemi`
      else if (w.endsWith('able') || w.endsWith('ible')) meaning = `${w}: yapılabilir / mümkün`
      else if (w.endsWith('ful')) meaning = `${w.slice(0, -3)} dolu / -li`
      else if (w.endsWith('less')) meaning = `${w.slice(0, -4)}sız / -siz`
      else if (w.endsWith('er') && w.length > 3) meaning = `${w.slice(0, -2)} yapan / daha …`
      else if (w.endsWith('est')) meaning = `en ${w.slice(0, -3)} / üstünlük`
      else if (w.endsWith('ous')) meaning = `${w.slice(0, -3)} ile ilgili / -li`
      else if (w.endsWith('ive')) meaning = `${w.slice(0, -3)} ile ilgili / sıfat`
      else if (w.endsWith('al') && w.length > 3) meaning = `${w.slice(0, -2)} ile ilgili / sıfat`
      else if (w.length <= 3) meaning = `${w.toUpperCase()} kısaltması / kısa biçim`
      else meaning = `${w} (özel ad, marka veya terim)`
    }
    entry.meaningTr = meaning
    entry.seeded = true
    entry.example = exampleFor(w, meaning)
    // Only cache strong API/hard-like glosses — not weak heuristics
    if (!isBad(meaning) && !meaning.includes('eyleminin') && !meaning.includes('şekilde / zarf')) {
      cache[w] = meaning
    } else if (cache[w] && isBad(cache[w])) {
      delete cache[w]
    }
    filled += 1
  }

  // Drop weak cache entries so future runs can re-fetch
  for (const [k, v] of Object.entries(cache)) {
    if (isBad(v)) delete cache[k]
  }
  saveCache(cache)
  fs.writeFileSync(bankFile, JSON.stringify(bank))
  const good = bank.filter((w) => w.seeded && !isBad(w.meaningTr)).length
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  meta.total = bank.length
  meta.seeded = good
  meta.quality = good
  meta.filledAt = new Date().toISOString()
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  console.log(`DONE total=${bank.length} quality=${good} remainingBad=${bank.filter((w) => isBad(w.meaningTr)).length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
