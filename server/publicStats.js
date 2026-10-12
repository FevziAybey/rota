import { format, startOfDay, subDays } from 'date-fns'

export function computePublicStats(data = {}) {
  const today = startOfDay(new Date())
  const todayKey = format(today, 'yyyy-MM-dd')
  const sessions = data.studySessions || []

  let streak = 0
  for (let i = 0; i < 365; i += 1) {
    const key = format(subDays(today, i), 'yyyy-MM-dd')
    const has = sessions.some((s) => s.date === key && s.minutes > 0)
    if (has) streak += 1
    else if (i === 0) continue
    else break
  }

  let weekMinutes = 0
  for (let i = 0; i < 7; i += 1) {
    const key = format(subDays(today, i), 'yyyy-MM-dd')
    weekMinutes += sessions
      .filter((s) => s.date === key)
      .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)
  }

  const known = Object.values(data.wordbankProgress || {}).filter((s) => s === 'known')
    .length

  return {
    streak,
    weekMinutes,
    wordbankKnown: known,
    todayMinutes: sessions
      .filter((s) => s.date === todayKey)
      .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0),
  }
}
