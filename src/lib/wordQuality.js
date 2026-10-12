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
