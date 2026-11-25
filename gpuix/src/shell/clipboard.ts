/** Clipboard content is stdin, never a command argument or a log line. */
import { join } from 'node:path'
export function clipboardAvailable() { return typeof Bun !== 'undefined' ? process.platform === 'win32' || process.platform === 'darwin' : typeof navigator !== 'undefined' && !!navigator.clipboard }
export async function copyText(text: string) {
  if (typeof Bun === 'undefined') { await navigator.clipboard.writeText(text); return }
  if (!clipboardAvailable()) throw new Error('Clipboard copying is unavailable in this build. Reveal and select the value to copy it manually.')
  const { spawnOwned } = await import('../../engine/src/process')
  const { DEFAULT_EXECUTION_LIMITS } = await import('../../engine/src/execution')
  const command = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'clip.exe') : '/usr/bin/pbcopy'
  if (!command) throw new Error('No clipboard helper is available on this system.')
  const child = spawnOwned({ cmd: [command], cwd: process.cwd(), input: text,
    limits: { ...DEFAULT_EXECUTION_LIMITS, processMemoryMB: 128, maxProcesses: 2, timeoutMs: 5000 } })
  const timer = setTimeout(() => child.terminateTree(), 5000)
  try {
    await Promise.all([new Response(child.stdout).arrayBuffer(), new Response(child.stderr).arrayBuffer()])
    if (await child.exited !== 0) throw new Error('The clipboard helper could not copy this value.')
  } finally { clearTimeout(timer); child.terminateTree() }
}
