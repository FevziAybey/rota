/** Simplified SM-2 style scheduling for wordbank cards */

const MS_DAY = 24 * 60 * 60 * 1000

export function emptySrsCard(status = 'learning') {
  return {
    status,
    ease: 2.3,
    interval: 0,
    repetitions: 0,
    due: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * @param {object|null} prev
 * @param {'known'|'learning'|'hard'} grade
 */
export function scheduleSrs(prev, grade) {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const card = prev ? { ...prev } : emptySrsCard(grade)

  let ease = Number(card.ease) || 2.3
  let interval = Number(card.interval) || 0
  let repetitions = Number(card.repetitions) || 0

  if (grade === 'hard') {
    repetitions = 0
    interval = 1
    ease = Math.max(1.3, ease - 0.25)
  } else if (grade === 'learning') {
    repetitions = Math.max(1, repetitions)
    interval = repetitions === 1 ? 1 : 2
    ease = Math.max(1.3, ease - 0.05)
  } else {
    // known
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 3
    else interval = Math.max(1, Math.round(interval * ease))
    repetitions += 1
    ease = Math.min(3.0, ease + 0.1)
  }

  const dueDate = new Date(today.getTime() + interval * MS_DAY)
  return {
    status: grade,
    ease: Math.round(ease * 100) / 100,
    interval,
    repetitions,
    due: dueDate.toISOString().slice(0, 10),
    updatedAt: todayKey,
  }
}

export function isDue(card, todayKey = new Date().toISOString().slice(0, 10)) {
  if (!card?.due) return true
  return card.due <= todayKey
}

export function listDueIds(srs = {}, progress = {}, limit = 40) {
  const today = new Date().toISOString().slice(0, 10)
  const ids = new Set([
    ...Object.keys(srs || {}),
    ...Object.keys(progress || {}).filter(
      (id) => progress[id] === 'hard' || progress[id] === 'learning',
    ),
  ])

  const due = []
  for (const id of ids) {
    const card = srs[id]
    const status = card?.status || progress[id]
    if (!status || status === 'known') {
      if (card && isDue(card, today)) due.push({ id, card, priority: 1 })
      continue
    }
    if (!card || isDue(card, today)) {
      due.push({
        id,
        card: card || emptySrsCard(status),
        priority: status === 'hard' ? 0 : 2,
      })
    }
  }

  return due
    .sort((a, b) => a.priority - b.priority || String(a.id).localeCompare(b.id))
    .slice(0, limit)
}
