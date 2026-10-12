/**
 * Production / Render readiness smoke check (local).
 * Run: node scripts/render-ready.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const checks = []

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  console.log(`${pass ? 'OK' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

ok('package.json start', true)
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
ok('start script', pkg.scripts?.start === 'node server/index.js')
ok('build script', Boolean(pkg.scripts?.build))
ok('wordbank:build', Boolean(pkg.scripts?.['wordbank:build']))
ok('engines.node', Boolean(pkg.engines?.node))

ok('render.yaml', fs.existsSync(path.join(root, 'render.yaml')))
ok(
  'google-10000.txt',
  fs.existsSync(path.join(root, 'scripts', 'google-10000.txt')),
)
ok(
  'wordbank.json or buildable',
  fs.existsSync(path.join(root, 'server', 'data', 'wordbank.json')) ||
    fs.existsSync(path.join(root, 'scripts', 'google-10000.txt')),
)
ok('server/index.js', fs.existsSync(path.join(root, 'server', 'index.js')))
ok('dist optional locally', true, 'Render build creates dist/')

const failed = checks.filter((c) => !c.pass)
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`)
  process.exit(1)
}
console.log('\nRender-ready checks passed')
