import { createReadStream } from 'node:fs'
import { lstat, readdir, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import type { UsageCounters, UsageSource } from './protocol'

export interface UsageRecord extends UsageCounters { id: string; at: number; model: string; provider: string; project: string; estimatedCostUSD?: number }
export const count = (value: unknown): number | undefined => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
export const money = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
const stamp = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN

/** Bounded streaming reader drops oversized/private message lines. Only normalized
 * usage metadata leaves this module; source transcripts remain read-only. */
export async function importUsageHistory(from: number, to: number, owned: Set<string>, signal: AbortSignal, home = homedir()) {
  const definitions = [
    { name: 'Codex', dir: join(home, '.codex', 'sessions'), format: 'codex' },
    { name: 'Claude Code', dir: join(home, '.claude', 'projects'), format: 'messages' },
    { name: 'Pi', dir: join(home, '.pi', 'agent', 'sessions'), format: 'messages' },
    { name: 'Oh My Pi', dir: join(home, '.omp', 'agent', 'sessions'), format: 'messages' },
    { name: 'Grok', dir: join(home, '.grok', 'sessions'), format: 'messages' },
    { name: 'Cursor Agent', dir: join(home, '.cursor', 'chats'), format: 'unsupported' },
    { name: 'Agy', dir: join(home, '.gemini', 'antigravity-cli', 'conversations'), format: 'unsupported' },
  ]
  const records: UsageRecord[] = [], sources: UsageSource[] = [], seen = new Map<string, number>(), seenFiles = new Set<string>()
  const deadline = Date.now() + 10000
  let bytes = 0, files = 0
  for (const definition of definitions) {
    signal.throwIfAborted()
    const source: UsageSource = { name: definition.name, status: 'missing', files: 0, records: 0, skipped: 0, detail: 'No local history found.' }
    sources.push(source)
    try { if (!(await lstat(definition.dir)).isDirectory()) continue } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { source.status = 'partial'; source.detail = 'This history directory could not be read.' }
      continue
    }
    let recognized = 0
    source.status = 'unsupported'; source.detail = 'History exists, but no supported usage records were found.'
    const skippedIncomplete = () => { source.skipped++; source.status = 'partial'; source.detail = 'Malformed, oversized or incomplete history records were skipped. Totals include only complete supported records.' }
    if (definition.format === 'unsupported') { source.detail = 'This history format does not yet expose supported usage metadata. Hiroshi-recorded usage is included.'; continue }
    const visit = async (directory: string, depth: number): Promise<void> => {
      if (depth > 8 || files >= 512 || bytes >= 256 * 1024 * 1024 || Date.now() > deadline) { source.status = 'partial'; source.detail = 'Import limit reached. Totals include only the records read.'; return }
      const entries = await readdir(directory, { withFileTypes: true })
      // Timestamped session directories and rollout names are newest first,
      // so a bounded/partial scan favors recent activity over old archives.
      entries.sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }))
      for (const entry of entries) {
        signal.throwIfAborted()
        if (Date.now() > deadline || files >= 512 || bytes >= 256 * 1024 * 1024 || records.length >= 100000) { source.status = 'partial'; source.detail = 'Import limit reached. Totals include only the records read.'; break }
        if (entry.isSymbolicLink()) continue
        const file = join(directory, entry.name)
        if (entry.isDirectory()) { await visit(file, depth + 1); continue }
        if (!entry.isFile() || !entry.name.endsWith('.jsonl') || /prompt_history/.test(entry.name)) continue
        const canonical = await realpath(file)
        if (seenFiles.has(canonical)) continue
        seenFiles.add(canonical); files++; source.files++
        let sessionID = '', model = 'Unknown model', project = 'Unknown project', turnID = '', previous: Record<string, number | undefined> | null = null
        const stream = createReadStream(file, { highWaterMark: 65536 })
        let pending = '', dropping = false
        const accept = (line: string) => {
          let event: any
          try { event = JSON.parse(line) } catch { skippedIncomplete(); return }
          if (!event || typeof event !== 'object') { source.skipped++; return }
          if (event.type === 'session_meta') { sessionID = typeof event.payload?.id === 'string' ? event.payload.id : ''; project = typeof event.payload?.cwd === 'string' ? event.payload.cwd : project; return }
          if (event.type === 'session') { sessionID = typeof event.id === 'string' ? event.id : sessionID; project = typeof event.cwd === 'string' ? event.cwd : project; return }
          if (event.type === 'turn_context') { model = typeof event.payload?.model === 'string' ? event.payload.model : model; turnID = typeof event.payload?.turn_id === 'string' ? event.payload.turn_id : ''; return }
          let counters: UsageCounters | null = null, identity = '', at = stamp(event.timestamp), estimatedCostUSD: number | undefined
          if (definition.format === 'codex' && event.type === 'event_msg' && event.payload?.type === 'token_count') {
            const info = event.payload.info
            if (!info) return
            const total = info.total_token_usage, last = info.last_token_usage
            if (!total || !last) return
            const fields: [keyof UsageCounters, string][] = [['inputTokens', 'input_tokens'], ['outputTokens', 'output_tokens'], ['cachedInputTokens', 'cached_input_tokens'], ['cacheWriteTokens', 'cache_write_input_tokens'], ['reasoningTokens', 'reasoning_output_tokens']]
            const current: Record<string, number | undefined> = Object.fromEntries(fields.map(([, key]) => [key, count(total[key])]))
            const duplicate = previous && fields.every(([, key]) => previous![key] === current[key])
            if (duplicate) return
            counters = {}
            for (const [name, key] of fields) {
              const value = current[key], before = previous?.[key]
              const delta = value !== undefined && before !== undefined && value >= before ? value - before : count(last[key])
              if (delta !== undefined) counters[name] = delta
            }
            previous = current
            identity = `${turnID || project}:${event.timestamp}:${total.total_tokens ?? JSON.stringify(current)}`
          } else {
            const message = event.message ?? (event.type === 'assistant' ? event : null)
            const usage = message?.usage
            if (!usage || (message.role && message.role !== 'assistant')) return
            sessionID = typeof event.sessionId === 'string' ? event.sessionId : sessionID
            model = typeof message.model === 'string' ? message.model : model
            project = typeof event.cwd === 'string' ? event.cwd : project
            const base = count(usage.input_tokens ?? usage.input), read = count(usage.cache_read_input_tokens ?? usage.cacheRead), write = count(usage.cache_creation_input_tokens ?? usage.cacheWrite)
            counters = { inputTokens: base === undefined ? undefined : base + (read ?? 0) + (write ?? 0), outputTokens: count(usage.output_tokens ?? usage.output),
              cachedInputTokens: read, cacheWriteTokens: write, reasoningTokens: count(usage.reasoning_output_tokens) }
            estimatedCostUSD = money(usage.cost?.total ?? usage.cost_usd)
            const messageID = message.id ?? event.requestId ?? event.uuid ?? event.id
            identity = typeof messageID === 'string' ? `${sessionID}:${messageID}` : `${event.timestamp}:${model}:${JSON.stringify(counters)}`
          }
          if (counters) recognized++
          if (!counters || !Number.isFinite(at) || at < from || at >= to || owned.has(sessionID)) { if (counters && owned.has(sessionID)) source.skipped++; return }
          if (counters.inputTokens === undefined && counters.outputTokens === undefined && counters.costUSD === undefined) return
          const id = createHash('sha256').update(`${definition.name}:${identity}`).digest('hex')
          const existing = seen.get(id)
          if (existing !== undefined) {
            source.skipped++
            if (definition.format !== 'codex') {
              const record = records[existing]!
              for (const [key, value] of Object.entries(counters)) if (value !== undefined) (record as any)[key] = value
              if (estimatedCostUSD !== undefined) record.estimatedCostUSD = estimatedCostUSD
            }
            return
          }
          seen.set(id, records.length)
          records.push({ ...counters, id, at, model, provider: definition.name, project, ...(estimatedCostUSD === undefined ? {} : { estimatedCostUSD }) }); source.records++
        }
        const decoder = new TextDecoder()
        try {
          for await (const chunk of stream) {
            signal.throwIfAborted()
            bytes += chunk.length
            if (bytes > 256 * 1024 * 1024 || Date.now() > deadline || records.length >= 100000) { source.status = 'partial'; source.detail = 'Import limit reached. Totals include only the records read.'; break }
            const pieces = decoder.decode(chunk, { stream: true }).split('\n')
            for (let index = 0; index < pieces.length; index++) {
              const piece = pieces[index]!
              if (!dropping) pending += piece
              if (pending.length > 128 * 1024) { pending = ''; dropping = true }
              if (index < pieces.length - 1) { if (!dropping && pending.trim()) accept(pending); else if (dropping) skippedIncomplete(); pending = ''; dropping = false }
            }
          }
          // A currently written, incomplete final line is never imported.
          if (pending.trim() || dropping) skippedIncomplete()
        } finally { stream.destroy() }
      }
    }
    try { await visit(definition.dir, 0) } catch (error) {
      signal.throwIfAborted(); source.status = 'partial'; source.detail = 'Some history files could not be read. Available usage was retained.'
    }
    if (source.status !== 'partial' && source.files > 0 && recognized > 0) {
      source.status = 'included'; source.detail = source.records ? 'Read-only usage metadata; matching Hiroshi sessions and duplicate records excluded.' : 'No new usage in this date window; matching Hiroshi sessions excluded.'
    }
  }
  return { records, sources }
}
