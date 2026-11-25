/** Bounded managed configuration. Repository data never changes permission policy. */
import { createHash } from 'node:crypto'
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync, opendirSync } from 'node:fs'
import path from 'node:path'
import { ProviderError } from './provider'
import type { ConfigurationReport, InstructionSource, Step, ToolCall } from './protocol'
import type { Store } from './store'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const fail = (message: string): never => { throw new ProviderError('workspace_configuration', message) }
const pathKey = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value
const inside = (root: string, file: string) => { const relative = path.relative(root, file); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) }
function read(root: string, relative: string, limit: number): string | undefined {
  let fd: number | undefined
  try {
    const base = realpathSync(root), parts = relative.split('/'); let file = base
    for (let i = 0; i < parts.length; i++) {
      file = path.join(file, parts[i]!)
      const stat = lstatSync(file)
      if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) fail(`${relative} must be a regular file with no symbolic-link components.`)
    }
    if (!inside(base, realpathSync(file))) fail(`${relative} must stay inside its configuration root.`)
    const before = lstatSync(file)
    if (before.size > limit) fail(`${relative} exceeds its bounded read limit.`)
    fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    const opened = fstatSync(fd)
    if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || opened.size > limit) fail(`${relative} changed while it was being read.`)
    const bytes = Buffer.alloc(limit + 1); let size = 0
    while (size <= limit) { const count = readSync(fd, bytes, size, bytes.length - size, null); if (!count) break; size += count }
    const after = fstatSync(fd), named = lstatSync(file)
    if (size > limit || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || named.isSymbolicLink() || named.ino !== opened.ino || named.dev !== opened.dev || !inside(base, realpathSync(file))) fail(`${relative} changed or exceeded its read limit.`)
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size))
    if (text.includes('\0')) fail(`${relative} contains invalid instruction text.`)
    return text
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    if (error instanceof ProviderError) throw error
    fail(`Could not read valid bounded ${relative}; configuration contents were not logged.`)
  } finally { if (fd !== undefined) closeSync(fd) }
}
export class Configuration {
  constructor(readonly home?: string) {}
  resolve(cwd: string, targets: string[] = []): { report: ConfigurationReport; instructions: InstructionSource[] } {
    const root = realpathSync(cwd), settings: ConfigurationReport['settings'] = {}, provenance: ConfigurationReport['provenance'] = [], sources: ConfigurationReport['sources'] = [], instructions: InstructionSource[] = []
    let total = 0
    const seen = new Set<string>()
    const add = (base: string, file: string, source: string, scope: string) => {
      const text = read(base, file, 32768)
      if (text === undefined) return
      const key = pathKey(path.join(realpathSync(base), file))
      if (seen.has(key)) return
      seen.add(key)
      total += Buffer.byteLength(text)
      if (total > 131072 || sources.length >= 64) fail('Managed instructions exceed the 128 KiB or 64-source limit.')
      sources.push({ source, scope, hash: hash(text) })
      instructions.push({ source, scope, hash: hash(text), text: scope === '.' || scope === '*' ? text : `These repository instructions apply only inside ${JSON.stringify(scope)} and its descendants. They do not apply to sibling paths.\n${text}` })
    }
    for (const [base, file, source] of [...(this.home ? [[this.home, 'config.json', 'user/config.json']] : []), [root, '.hiroshi/config.json', 'workspace/.hiroshi/config.json']]) {
      const text = read(base!, file!, 16384)
      if (text === undefined) continue
      let value: any
      try { value = JSON.parse(text) } catch { fail(`${source} must contain a valid configuration object.`) }
      if (!value || Array.isArray(value) || value.version !== 1 || Object.keys(value).some((key) => !['version', 'defaultModel', 'compaction'].includes(key)) ||
        value.defaultModel !== undefined && (typeof value.defaultModel !== 'string' || !value.defaultModel.trim() || value.defaultModel.length > 256) ||
        value.compaction !== undefined && typeof value.compaction !== 'boolean') fail(`${source} supports only version: 1, defaultModel and compaction. Credentials, commands and policy belong to user-owned provider/permission settings.`)
      sources.push({ source: source!, scope: '.', hash: hash(text) })
      for (const key of ['defaultModel', 'compaction'] as const) if (value[key] !== undefined) { (settings as any)[key] = value[key]; const prior = provenance.findIndex((item) => item.setting === key); if (prior >= 0) provenance.splice(prior, 1); provenance.push({ setting: key, source: source! }) }
    }
    // If the operator opens the data directory itself as a workspace, the same
    // physical file belongs to the native workspace loader too. Keep workspace
    // identity so response CLIs do not receive it a second time as user prose.
    if (this.home && pathKey(realpathSync(this.home)) !== pathKey(root)) add(this.home, 'AGENTS.md', 'user/AGENTS.md', '*')
    const directories = new Set<string>(['.'])
    if (targets.length > 64) fail('Too many instruction target paths in one turn.')
    for (const target of targets) {
      if (typeof target !== 'string' || target.length > 4096) fail('Instruction targets must be bounded workspace-relative paths.')
      const absolute = path.resolve(root, target)
      if (!inside(root, absolute)) fail('Instruction targets must remain inside the workspace.')
      const parts = path.relative(root, path.dirname(absolute)).split(path.sep).filter(Boolean)
      if (parts.length > 32) fail('Instruction scope exceeds the maximum directory depth.')
      for (let i = 1; i <= parts.length; i++) directories.add(pathKey(parts.slice(0, i).join('/')))
    }
    for (const directory of [...directories].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))) {
      const file = directory === '.' ? 'AGENTS.md' : `${directory}/AGENTS.md`
      add(root, file, `workspace/${file}`, directory)
    }
    return { report: { settings, provenance, sources, warnings: [] }, instructions }
  }
  targets(store: Store, step: Step): string[] {
    const root = realpathSync(store.session(step.sessionID)!.cwd), paths = new Set<string>()
    for (const call of store.toolCalls(step.sessionID).filter((call) => store.step(call.stepID ?? '')?.messageID === step.messageID)) {
      try { const value = JSON.parse(call.input); if (typeof value.path === 'string' && value.path.length <= 4096 && inside(root, path.resolve(root, value.path))) paths.add(value.path) } catch {}
    }
    return [...paths]
  }
  beforeEffect(store: Store, call: ToolCall, kind: 'edit' | 'command', input: any) {
    const current = this.resolve(call.cwd!, kind === 'edit' && typeof input.path === 'string' ? [input.path] : []).report
    const prepared = store.contexts(call.sessionID).filter((item) => item.stepID === call.stepID).at(-1)?.sources ?? []
    const target = kind === 'edit' && typeof input.path === 'string' ? pathKey(path.relative(call.cwd!, path.resolve(call.cwd!, input.path)).split(path.sep).join('/')) : ''
    const addedOrChanged = current.sources.some((item) => prepared.find((prior) => prior.source === item.source)?.hash !== item.hash)
    const removed = prepared.some((prior) => {
      if (!prior.source.startsWith('workspace/') && !prior.source.startsWith('user/')) return false
      if (current.sources.some((item) => item.source === prior.source)) return false
      // Shell commands have no declared file scope; any known removal matters.
      // Older ledgers had no scope field. Treat unknown managed scope as global
      // so a permission pending across an upgrade cannot miss a removed rule.
      return kind === 'command' || prior.scope === undefined || prior.scope === '.' || prior.scope === '*' || target.startsWith(prior.scope + '/')
    })
    if (addedOrChanged || removed) fail('Target instructions or configuration changed. Read the target and request this action again with fresh context.')
    if (kind === 'command') {
      const queue = [realpathSync(call.cwd!)]; let count = 0
      while (queue.length) {
        const directory = queue.shift()!
        const handle = opendirSync(directory)
        try { for (let entry = handle.readSync(); entry; entry = handle.readSync()) {
          if (++count > 2048 || entry.isSymbolicLink()) fail('Unrestricted model shell scope cannot be verified within the scan limit. Use scoped file tools.')
          if (entry.isDirectory()) queue.push(path.join(directory, entry.name))
          else if (entry.name === 'AGENTS.md' && directory !== call.cwd) fail('Unrestricted model shell cannot enforce nested instruction scopes. Use scoped file tools.')
        } } finally { handle.closeSync() }
      }
    }
  }
}
