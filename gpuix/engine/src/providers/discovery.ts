import { accessSync, constants, existsSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, delimiter, dirname, isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'
import type { AgentID } from '../protocol'

export const AGENTS: { id: AgentID; name: string }[] = [
  { id: 'agy', name: 'Agy' }, { id: 'cursor', name: 'Cursor Agent' }, { id: 'pi', name: 'Pi' }, { id: 'grok', name: 'Grok' },
]
export function validCommand(command: unknown): command is string[] {
  return Array.isArray(command) && command.length >= 1 && command.length <= 2 &&
    command.every((arg) => typeof arg === 'string' && isAbsolute(arg) && arg.length <= 2048 && !/[\r\n\0]/.test(arg)) &&
    !/\.(cmd|bat|ps1)$/i.test(command[0]) && !/^hiroshi(?:-engine)?(?:\.exe)?$/i.test(basename(command[0])) &&
    (command.length === 1 || /\.(?:[cm]?js|ts)$/i.test(command[1]))
}
export function fingerprint(command: string[]): string | null {
  try {
    if (!validCommand(command)) return null
    const files = command.map((file, index) => {
      const canonical = realpathSync(file), stat = statSync(canonical)
      if (!stat.isFile()) throw new Error('not a file')
      if (!index) accessSync(file, constants.X_OK)
      return [canonical, stat.size, stat.mtimeMs, stat.ino]
    })
    return createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16)
  } catch { return null }
}
export function discoverCommand(id: AgentID, env: Record<string, string | undefined>): string[] | null {
  const home = (process.platform === 'win32' ? env.USERPROFILE : env.HOME) || homedir()
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter((path) => isAbsolute(path))
  const name = id === 'cursor' ? 'cursor-agent' : id
  const candidates = dirs.flatMap((dir) => (process.platform === 'win32' ? ['.exe', '.cmd', '.ps1', ''] : ['']).map((ext) => join(dir, name + ext)))
  const exe = process.platform === 'win32' ? '.exe' : ''
  if (id === 'agy') candidates.push(join(home, 'AppData', 'Local', 'agy', 'bin', 'agy.exe'), join(home, '.local', 'bin', 'agy'))
  if (id === 'cursor') candidates.push(join(home, 'AppData', 'Local', 'cursor-agent', 'cursor-agent.cmd'), join(home, '.local', 'bin', 'cursor-agent'))
  if (id === 'grok') candidates.push(join(home, '.grok', 'bin', 'grok' + exe))
  if (id === 'pi') candidates.push(join(home, 'AppData', 'Roaming', 'npm', 'pi.cmd'), join(home, '.local', 'bin', 'pi'))
  for (const file of candidates.slice(0, 512)) {
    if (!existsSync(file)) continue
    if (!/\.(cmd|ps1)$/i.test(file)) { if (fingerprint([file])) return [file]; continue }
    // Resolve known vendor layouts; never interpret or execute wrapper text.
    if (id === 'cursor') {
      const root = dirname(file), versions = join(root, 'versions')
      const dirs = [root]
      try { dirs.push(...readdirSync(versions).filter((name) => /^\d{4}\.\d{1,2}\.\d{1,2}(?:-\d{2}-\d{2}-\d{2})?-[a-f0-9]+$/.test(name))
        .sort((a, b) => b.localeCompare(a, 'en', { numeric: true })).slice(0, 128).map((name) => join(versions, name))) } catch {}
      for (const dir of dirs) { const command = [join(dir, 'node.exe'), join(dir, 'index.js')]; if (fingerprint(command)) return command }
    }
    if (id === 'pi') {
      const node = dirs.map((dir) => join(dir, 'node.exe')).find((file) => fingerprint([file]))
      if (!node) continue
      for (const scope of ['@earendil-works', '@mariozechner']) {
        const command = [node, join(dirname(file), 'node_modules', scope, 'pi-coding-agent', 'dist', 'cli.js')]
        if (fingerprint(command)) return command
      }
    }
  }
  return null
}
