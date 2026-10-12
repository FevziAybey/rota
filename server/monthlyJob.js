import { initStore, listUsers, getUserData } from './store.js'
import { sendMail, mailConfigured } from './mail.js'
import { sendMonthlyReports } from './report.js'

async function main() {
  if (!mailConfigured()) {
    console.error('SMTP ayarları yok. SMTP_HOST / SMTP_USER / SMTP_PASS gerekli.')
    process.exit(1)
  }

  await initStore()
  const results = await sendMonthlyReports({ listUsers, getUserData, sendMail })
  console.log(JSON.stringify({ ok: true, count: results.length, results }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
