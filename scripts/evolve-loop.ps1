# Rota continuous improvement wake loop (local)
# Sentinel wakes the Cursor agent every interval.
$intervalSec = 1200
$purpose = 'rota'
while ($true) {
  Start-Sleep -Seconds $intervalSec
  $payload = @{
    prompt = @'
Rota sürekli geliştirme turu (workspace: yeni projelendirme).
AGENTS.md ve .cursor/rules/rota-evolve.mdc uygula.
1) Bug/kırık akış ara ve düzelt
2) npm run build + render:check
3) Küçük UX veya kelime havuzu/kalite iyileştirmesi yap
4) Render uyumluluğunu bozma (tek start, dist serve, Postgres)
Türkçe kısa özet ver. Commit etme.
'@
  } | ConvertTo-Json -Compress
  Write-Output "AGENT_LOOP_TICK_rota $payload"
}
