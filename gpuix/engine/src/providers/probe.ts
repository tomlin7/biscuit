/** Metadata commands only. Never invoke a shell, login, an agent prompt or a
 * credential-printing command here. Every caller owns a shared budget slot. */
import { spawnOwned } from '../process'
import type { ExecutionLimits } from '../protocol'

export async function probe(command: string[], args: string[], cwd: string, env: Record<string, string | undefined>, limits: ExecutionLimits, signal: AbortSignal) {
  signal.throwIfAborted()
  const child = spawnOwned({ cmd: [...command, ...args], cwd, limits,
    env: { ...Object.fromEntries(Object.entries(env).filter(([key]) => !['NODE_OPTIONS', 'BUN_OPTIONS'].includes(key.toUpperCase()))), NO_OPEN_BROWSER: '1', NO_COLOR: '1', CI: '1' } })
  const readers = new Set<ReadableStreamDefaultReader<Uint8Array>>()
  let bytes = 0, timedOut = false
  const stop = () => { child.terminateTree(); for (const reader of readers) void reader.cancel().catch(() => {}) }
  signal.addEventListener('abort', stop, { once: true })
  const timer = setTimeout(() => { timedOut = true; stop() }, 8000)
  const read = async (stream: ReadableStream<Uint8Array>) => {
    const reader = stream.getReader(); readers.add(reader)
    let value = ''; const decoder = new TextDecoder()
    try {
      if (signal.aborted) { await reader.cancel(); return value }
      for (;;) {
        const next = await reader.read(); if (next.done) break
        if ((bytes += next.value.length) > 128 * 1024) throw new Error('probe output limit')
        value += decoder.decode(next.value, { stream: true })
      }
      return (value + decoder.decode()).replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    } finally { readers.delete(reader); reader.releaseLock() }
  }
  try {
    const [out, err] = await Promise.all([read(child.stdout), read(child.stderr)])
    const code = await child.exited; signal.throwIfAborted()
    return { code, out, err, timedOut }
  } finally { clearTimeout(timer); signal.removeEventListener('abort', stop); stop(); await child.exited.catch(() => {}) }
}
