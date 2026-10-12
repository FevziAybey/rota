const TEMPLATES = [
  (words) =>
    `Today I practiced English with care. First I reviewed ${words[0]}, then I used ${words[1]} in a short note. Later I noticed ${words[2]} while reading, and I tried to remember ${words[3]}. By evening, ${words[4]} felt a little easier.`,
  (words) =>
    `In my study session I wrote sentences with ${words[0]} and ${words[1]}. A podcast mentioned ${words[2]}, so I paused and repeated it. Then I connected ${words[3]} with ${words[4]} in one paragraph.`,
  (words) =>
    `Learning works best in small steps. I started with ${words[0]}, checked the meaning of ${words[1]}, and listened to ${words[2]}. After that I made an example for ${words[3]} and closed the day with ${words[4]}.`,
]

export function buildReadingPassage(wordList = []) {
  const words = wordList
    .map((w) => (typeof w === 'string' ? w : w.word))
    .filter(Boolean)
    .slice(0, 5)

  while (words.length < 5) {
    words.push(['focus', 'habit', 'progress', 'memory', 'practice'][words.length])
  }

  const tpl = TEMPLATES[words.join('').length % TEMPLATES.length]
  const text = tpl(words)
  return { text, highlights: [...new Set(words)] }
}

export function highlightHtml(text, highlights = []) {
  let html = text
  const sorted = [...highlights].sort((a, b) => b.length - a.length)
  for (const w of sorted) {
    const re = new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
    html = html.replace(re, '<mark class="read-mark">$1</mark>')
  }
  return html
}
