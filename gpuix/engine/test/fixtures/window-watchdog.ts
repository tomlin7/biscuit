import { readFileSync, writeFileSync } from 'node:fs'
const [counter, mode] = process.argv.slice(2)
let count = 0
try { count = Number(readFileSync(counter, 'utf8')) } catch {}
writeFileSync(counter, String(++count))
if (mode === 'fail' || (mode === 'crash' && count === 1)) process.exit(7)
process.send?.({ type: 'hiroshi.window.alive' })
if (mode === 'hang' && count === 1) setTimeout(() => { while (true) {} }, 100)
const timer = setInterval(() => process.send?.({ type: 'hiroshi.window.alive' }), 100)
setTimeout(() => { clearInterval(timer); process.exit(0) }, 300)
