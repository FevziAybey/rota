import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { tr } from 'date-fns/locale'

export function previousMonthRange(reference = new Date()) {
  const monthDate = subMonths(reference, 1)
  return {
    monthDate,
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
    label: format(monthDate, 'MMMM yyyy', { locale: tr }),
  }
}

export function buildMonthlyReport(user, data, reference = new Date()) {
  const { start, end, label } = previousMonthRange(reference)

  const inMonth = (dateStr) => {
    if (!dateStr) return false
    const d = parseISO(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr)
    return isWithinInterval(d, { start, end })
  }

  const sessions = (data.studySessions || []).filter((s) => inMonth(s.date))
  const totalMinutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)
  const byType = sessions.reduce((acc, s) => {
    const key = s.type || 'other'
    acc[key] = (acc[key] || 0) + (Number(s.minutes) || 0)
    return acc
  }, {})

  const newWords = (data.vocabulary || []).filter((w) => inMonth(w.createdAt))
  const masteredInMonth = (data.vocabulary || []).filter(
    (w) => w.mastered && inMonth(w.createdAt),
  )
  const goalsDone = (data.goals || []).filter(
    (g) => g.status === 'done' && inMonth(g.createdAt),
  )
  const notes = (data.notes || []).filter((n) => inMonth(n.createdAt))
  const files = (data.files || []).filter((f) => inMonth(f.uploadedAt))
  const activeGoals = (data.goals || []).filter((g) => g.status === 'active')

  const typeLabels = {
    vocab: 'Kelime',
    reading: 'Okuma',
    listening: 'Dinleme',
    speaking: 'Konuşma',
    grammar: 'Gramer',
    other: 'Diğer',
  }

  const typeLines = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, minutes]) => `• ${typeLabels[type] || type}: ${minutes} dk`)

  const summary = {
    label,
    totalMinutes,
    sessionCount: sessions.length,
    newWords: newWords.length,
    masteredWords: masteredInMonth.length,
    goalsDone: goalsDone.length,
    activeGoals: activeGoals.length,
    notes: notes.length,
    files: files.length,
    byType,
  }

  const text = [
    `Merhaba ${user.name},`,
    '',
    `Rota aylık ilerleme raporun — ${label}`,
    '',
    `Çalışma: ${totalMinutes} dk (${sessions.length} seans)`,
    ...(typeLines.length ? ['Türlere göre:', ...typeLines] : []),
    `Yeni kelime: ${newWords.length}`,
    `Öğrenildi işaretlenen: ${masteredInMonth.length}`,
    `Tamamlanan hedef: ${goalsDone.length}`,
    `Aktif hedef: ${activeGoals.length}`,
    `Not: ${notes.length}`,
    `Yüklenen dosya: ${files.length}`,
    '',
    'Bir sonraki ay da aynı tempoda devam. — Rota',
  ].join('\n')

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#10201c;line-height:1.5">
      <h1 style="font-weight:500;font-size:28px;margin:0 0 8px">Rota aylık raporu</h1>
      <p style="color:#5f746b;margin:0 0 20px">${label}</p>
      <p>Merhaba <strong>${user.name}</strong>,</p>
      <p>Geçen ayki ilerlemenin özeti:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;border-bottom:1px solid #d9e6e0">Çalışma süresi</td><td style="padding:8px 0;border-bottom:1px solid #d9e6e0;text-align:right"><strong>${totalMinutes} dk</strong></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #d9e6e0">Seans</td><td style="padding:8px 0;border-bottom:1px solid #d9e6e0;text-align:right"><strong>${sessions.length}</strong></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #d9e6e0">Yeni kelime</td><td style="padding:8px 0;border-bottom:1px solid #d9e6e0;text-align:right"><strong>${newWords.length}</strong></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #d9e6e0">Tamamlanan hedef</td><td style="padding:8px 0;border-bottom:1px solid #d9e6e0;text-align:right"><strong>${goalsDone.length}</strong></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #d9e6e0">Not / dosya</td><td style="padding:8px 0;border-bottom:1px solid #d9e6e0;text-align:right"><strong>${notes.length} / ${files.length}</strong></td></tr>
      </table>
      ${
        typeLines.length
          ? `<p style="margin:0 0 8px"><strong>Türlere göre</strong></p><p style="white-space:pre-line;color:#3d534a">${typeLines.join('\n')}</p>`
          : ''
      }
      <p style="color:#5f746b;margin-top:24px">Bir sonraki ayda görüşmek üzere.<br/>— Rota</p>
    </div>
  `

  return { summary, text, html, subject: `Rota — ${label} ilerleme raporun` }
}

export async function sendMonthlyReports({ listUsers, getUserData, sendMail }) {
  const users = await listUsers()
  const results = []

  for (const user of users) {
    const data = await getUserData(user.id)
    if (data.settings?.monthlyReport === false) {
      results.push({ email: user.email, skipped: true, reason: 'disabled' })
      continue
    }

    const report = buildMonthlyReport(user, data)
    await sendMail({
      to: user.email,
      subject: report.subject,
      text: report.text,
      html: report.html,
    })
    results.push({ email: user.email, sent: true, summary: report.summary })
  }

  return results
}
