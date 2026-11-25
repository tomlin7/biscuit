import { currentEngineHome } from '../../engine/src/home'

export function readModelFavorites(): string[] | null {
  if (typeof Bun === 'undefined') return null
  try {
    const fs = require('node:fs') as typeof import('node:fs'), path = require('node:path') as typeof import('node:path')
    const file = path.join(currentEngineHome(), 'model-favorites.json')
    if (fs.statSync(file).size > 256 * 1024) return []
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))
    return value.version === 1 && Array.isArray(value.ids) ? [...new Set<string>(value.ids.filter((id: unknown) => typeof id === 'string' && id.length <= 256).slice(0, 1024))] : []
  } catch { return [] }
}
export function saveModelFavorites(ids: string[]) {
  if (typeof Bun === 'undefined') return
  const fs = require('node:fs') as typeof import('node:fs'), path = require('node:path') as typeof import('node:path')
  const home = currentEngineHome(), file = path.join(home, 'model-favorites.json'), temp = `${file}.${process.pid}.tmp`
  fs.mkdirSync(home, { recursive: true })
  try { fs.writeFileSync(temp, JSON.stringify({ version: 1, ids: ids.slice(0, 1024) }), { mode: 0o600 }); fs.renameSync(temp, file) }
  finally { try { fs.unlinkSync(temp) } catch {} }
}
