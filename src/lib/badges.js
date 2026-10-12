export const BADGE_DEFS = [
  {
    id: 'streak3',
    title: '3 gün seri',
    desc: 'Üst üste 3 gün çalıştın',
    check: (s) => s.streak >= 3,
  },
  {
    id: 'streak7',
    title: '7 gün seri',
    desc: 'Bir haftalık tempon tuttu',
    check: (s) => s.streak >= 7,
  },
  {
    id: 'words50',
    title: '50 kelime',
    desc: 'Havuzda 50 kelime öğrendin',
    check: (s) => s.wordbankKnown >= 50,
  },
  {
    id: 'words500',
    title: '500 kelime',
    desc: 'Havuzda 500 kelime öğrendin',
    check: (s) => s.wordbankKnown >= 500,
  },
  {
    id: 'band1',
    title: 'İlk 1000',
    desc: '1–1000 bandında 200+ kelime biliniyor',
    check: (s) => (s.bandKnown?.['1-1000'] || 0) >= 200,
  },
  {
    id: 'b1',
    title: 'B1 bandı',
    desc: '1001–3000 bandında 300+ kelime',
    check: (s) =>
      (s.bandKnown?.['1001-2000'] || 0) + (s.bandKnown?.['2001-3000'] || 0) >= 300,
  },
  {
    id: 'quest7',
    title: 'Görev ustası',
    desc: '7 günlük görevi tamamladın',
    check: (s) => s.questsCompleted >= 7,
  },
  {
    id: 'files3',
    title: 'Arşivci',
    desc: 'En az 3 dosya yükledin',
    check: (s) => s.fileCount >= 3,
  },
]

export function evaluateBadges(stats, unlocked = []) {
  const have = new Set(unlocked)
  const newly = []
  for (const b of BADGE_DEFS) {
    if (have.has(b.id)) continue
    if (b.check(stats)) newly.push(b.id)
  }
  return newly
}
