/**
 * Replace weak "yaygın İngilizce sözcük" glosses with better TR meanings.
 * Uses HARD map + morphology + MyMemory (slow) for leftovers.
 * Run: node scripts/gloss-weak-meanings.mjs
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
const DELAY = Number(process.env.FILL_DELAY || 250)
const SKIP_API = process.env.FILL_SKIP_API === '1'

const HARD = {
  park: 'park / park etmek',
  side: 'yan / taraf',
  key: 'anahtar / tuş / önemli',
  war: 'savaş',
  become: 'olmak / dönüşmek',
  status: 'durum / statü',
  february: 'şubat',
  baby: 'bebek',
  film: 'film / film çekmek',
  true: 'doğru / gerçek',
  risk: 'risk / tehlike',
  self: 'kendi / benlik',
  major: 'büyük / ana / binbaşı',
  washington: 'Washington (yer / kişi)',
  california: 'Kaliforniya',
  texas: 'Teksas',
  florida: 'Florida',
  virginia: 'Virginia',
  york: 'York (yer adı)',
  san: 'San (yer adı öneki)',
  blog: 'ağ günlüğü / blog',
  yahoo: 'Yahoo (marka)',
  google: 'Google (marka) / aramak',
  microsoft: 'Microsoft (marka)',
  sony: 'Sony (marka)',
  linux: 'Linux (işletim sistemi)',
  faq: 'sıkça sorulan sorular',
  rss: 'RSS (haber akışı)',
  logo: 'logo / amblem',
  golf: 'golf (spor)',
  david: 'David (erkek adı)',
  james: 'James (erkek adı)',
  michael: 'Michael (erkek adı)',
  paul: 'Paul (erkek adı)',
  robert: 'Robert (erkek adı)',
  george: 'George (erkek adı)',
  cnet: 'CNET (teknoloji sitesi)',
  cd: 'CD / kompakt disk',
  ii: 'II (Roma rakamı 2)',
  usr: 'kullanıcı dizini (usr)',
  january: 'ocak',
  march: 'mart / yürüyüş',
  april: 'nisan',
  may: 'mayıs / -ebilmek',
  june: 'haziran',
  july: 'temmuz',
  august: 'ağustos',
  september: 'eylül',
  october: 'ekim',
  november: 'kasım',
  december: 'aralık',
  monday: 'pazartesi',
  tuesday: 'salı',
  wednesday: 'çarşamba',
  thursday: 'perşembe',
  friday: 'cuma',
  saturday: 'cumartesi',
  sunday: 'pazar',
  london: 'Londra',
  paris: 'Paris',
  berlin: 'Berlin',
  tokyo: 'Tokyo',
  china: 'Çin',
  japan: 'Japonya',
  france: 'Fransa',
  germany: 'Almanya',
  italy: 'İtalya',
  spain: 'İspanya',
  mexico: 'Meksika',
  canada: 'Kanada',
  australia: 'Avustralya',
  india: 'Hindistan',
  russia: 'Rusya',
  brazil: 'Brezilya',
  africa: 'Afrika',
  europe: 'Avrupa',
  asia: 'Asya',
  america: 'Amerika',
  english: 'İngilizce / İngiliz',
  french: 'Fransızca / Fransız',
  german: 'Almanca / Alman',
  spanish: 'İspanyolca / İspanyol',
  chinese: 'Çince / Çinli',
  japanese: 'Japonca / Japon',
  hotel: 'otel',
  airport: 'havaalanı',
  university: 'üniversite',
  college: 'kolej / yüksekokul',
  school: 'okul',
  student: 'öğrenci',
  teacher: 'öğretmen',
  doctor: 'doktor',
  hospital: 'hastane',
  police: 'polis',
  street: 'sokak',
  city: 'şehir',
  country: 'ülke / kırsal',
  world: 'dünya',
  people: 'insanlar / halk',
  person: 'kişi',
  woman: 'kadın',
  man: 'adam / erkek',
  child: 'çocuk',
  children: 'çocuklar',
  family: 'aile',
  friend: 'arkadaş',
  house: 'ev',
  home: 'ev / yuva',
  room: 'oda',
  door: 'kapı',
  window: 'pencere',
  table: 'masa / tablo',
  chair: 'sandalye',
  book: 'kitap',
  page: 'sayfa',
  word: 'kelime / sözcük',
  language: 'dil',
  music: 'müzik',
  movie: 'film',
  game: 'oyun',
  sport: 'spor',
  food: 'yiyecek / yemek',
  water: 'su',
  money: 'para',
  time: 'zaman / kez',
  day: 'gün',
  night: 'gece',
  week: 'hafta',
  month: 'ay',
  year: 'yıl',
  hour: 'saat',
  minute: 'dakika',
  second: 'saniye / ikinci',
}

function isWeak(meaning) {
  const m = String(meaning || '')
  return (
    !m ||
    m.startsWith('Sık kullanılan') ||
    m.includes('bağlamda öğren') ||
    m.includes('yaygın İngilizce sözcük') ||
    /İngilizce kelime\s*\(sıra/.test(m)
  )
}

function isQuality(meaning) {
  const m = String(meaning || '').trim()
  if (!m || isWeak(m)) return false
  if (m.startsWith('(')) return false
  return true
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
  if (isWeak(text)) return null
  return text
}

function heuristic(w) {
  if (w.endsWith('ing') && w.length > 4)
    return `${w.slice(0, -3)} eyleminin -ing hali / sürmekte olan`
  if (w.endsWith('ed') && w.length > 3)
    return `${w.slice(0, -2)} eyleminin geçmiş hali / -miş`
  if (w.endsWith('ly') && w.length > 3) return `${w.slice(0, -2)} şekilde / zarf`
  if (w.endsWith('tion') || w.endsWith('sion')) return `${w} (isim): eylem veya durum`
  if (w.endsWith('ness')) return `${w.slice(0, -4)} olma durumu`
  if (w.endsWith('ment')) return `${w.slice(0, -4)} sonucu / eylemi`
  if (w.endsWith('able') || w.endsWith('ible')) return `${w}: yapılabilir / mümkün`
  if (w.endsWith('ful')) return `${w.slice(0, -3)} dolu / -li`
  if (w.endsWith('less')) return `${w.slice(0, -4)}sız / -siz`
  if (w.endsWith('er') && w.length > 4) return `${w.slice(0, -2)} yapan kişi/şey veya daha …`
  if (w.endsWith('est') && w.length > 4) return `en ${w.slice(0, -3)} / üstünlük`
  if (w.endsWith('ous')) return `${w.slice(0, -3)} ile ilgili / -li`
  if (w.endsWith('ive')) return `${w.slice(0, -3)} ile ilgili / sıfat`
  if (w.endsWith('al') && w.length > 3) return `${w.slice(0, -2)} ile ilgili / sıfat`
  if (w.endsWith('ism')) return `${w.slice(0, -3)} ideolojisi / -izm`
  if (w.endsWith('ist')) return `${w.slice(0, -3)} taraftarı / -ist`
  if (w.endsWith('ity') || w.endsWith('ty')) return `${w}: nitelik / durum`
  if (/^\d/.test(w)) return `${w} (sayı / kod)`
  if (w.length <= 2) return `${w.toUpperCase()} (kısaltma / harf)`
  if (w.length <= 3 && w === w.toLowerCase()) return `${w.toUpperCase()} kısaltması / kısa biçim`
  // Proper-name-ish: keep as named entity gloss
  return `${w} (özel ad, marka veya terim)`
}

function exampleFor(word, meaning) {
  return `I often use the word "${word}" — it means "${meaning}".`
}

function loadCache() {
  const cache = {}
  if (fs.existsSync(cacheFile)) Object.assign(cache, JSON.parse(fs.readFileSync(cacheFile, 'utf8')))
  if (fs.existsSync(gCacheFile)) Object.assign(cache, JSON.parse(fs.readFileSync(gCacheFile, 'utf8')))
  for (const [k, v] of Object.entries(cache)) {
    if (isWeak(v)) delete cache[k]
  }
  return cache
}

function saveCache(cache) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache))
  fs.writeFileSync(gCacheFile, JSON.stringify(cache))
}

async function main() {
  const bank = JSON.parse(fs.readFileSync(bankFile, 'utf8'))
  const cache = loadCache()
  let fixed = 0

  for (const entry of bank) {
    const hard = HARD[entry.word]
    if (hard && (isWeak(entry.meaningTr) || entry.meaningTr === hard)) {
      entry.meaningTr = hard
      entry.seeded = true
      entry.example = exampleFor(entry.word, hard)
      cache[entry.word] = hard
      fixed += 1
      continue
    }
    if (!isWeak(entry.meaningTr)) continue
    const cached = cache[entry.word]
    if (cached && isQuality(cached)) {
      entry.meaningTr = cached
      entry.seeded = true
      entry.example = exampleFor(entry.word, cached)
      fixed += 1
    }
  }

  const pending = bank.filter((e) => isWeak(e.meaningTr))
  console.log(`Weak remaining after hard/cache: ${pending.length}`)

  if (!SKIP_API && pending.length) {
    let i = 0
    let consecutive429 = 0
    async function worker() {
      while (i < pending.length) {
        if (consecutive429 >= 25) return
        const idx = i
        i += 1
        const entry = pending[idx]
        if (!isWeak(entry.meaningTr)) continue
        try {
          const meaning = await translate(entry.word)
          await sleep(DELAY)
          consecutive429 = 0
          if (meaning && isQuality(meaning)) {
            cache[entry.word] = meaning
            entry.meaningTr = meaning
            entry.seeded = true
            entry.example = exampleFor(entry.word, meaning)
            fixed += 1
            if (fixed % 30 === 0) {
              saveCache(cache)
              fs.writeFileSync(bankFile, JSON.stringify(bank))
              console.log(`fixed≈${fixed} left≈${pending.length - idx}`)
            }
          }
        } catch (err) {
          if (String(err.message).includes('429')) consecutive429 += 1
          console.warn(`skip ${entry.word}: ${err.message}`)
          await sleep(DELAY * 4)
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
    if (consecutive429 >= 25) console.log('Rate-limited — applying heuristics to rest')
  }

  for (const entry of bank) {
    if (!isWeak(entry.meaningTr)) continue
    const meaning = heuristic(entry.word)
    entry.meaningTr = meaning
    entry.seeded = true
    entry.example = exampleFor(entry.word, meaning)
    fixed += 1
  }

  saveCache(cache)
  fs.writeFileSync(bankFile, JSON.stringify(bank))
  const quality = bank.filter((w) => w.seeded && isQuality(w.meaningTr)).length
  const weakLeft = bank.filter((w) => isWeak(w.meaningTr)).length
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  meta.total = bank.length
  meta.seeded = bank.filter((w) => w.seeded).length
  meta.quality = quality
  meta.filledAt = new Date().toISOString()
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  console.log(`DONE fixed≈${fixed} quality=${quality} weakLeft=${weakLeft}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
