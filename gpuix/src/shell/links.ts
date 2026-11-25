export interface ShellLink { sessionID: string; file?: string; line?: number }

export function parseShellLink(value: string): ShellLink {
  const url = new URL(value)
  if (url.protocol !== 'hiroshi:' || url.hostname !== 'session' || url.username || url.password || url.port || url.hash) throw new Error('Expected hiroshi://session/<session-id>')
  const sessionID = decodeURIComponent(url.pathname.slice(1))
  if (!/^ses_[a-zA-Z0-9_-]+$/.test(sessionID)) throw new Error('Invalid session id')
  const file = url.searchParams.get('file') ?? undefined
  if (file && (file.startsWith('/') || /[\\:\x00-\x1f]/.test(file) || file.split('/').some((part) => part === '..' || part === '.'))) throw new Error('File must be a relative workspace path')
  const raw = url.searchParams.get('line')
  const line = raw === null ? undefined : Number(raw)
  if (line !== undefined && (!file || !Number.isSafeInteger(line) || line < 1 || line > 10_000_000)) throw new Error('Invalid source line')
  return { sessionID, ...(file ? { file } : {}), ...(line ? { line } : {}) }
}

export function launchLink(argv: string[] = process.argv): ShellLink | null {
  const value = argv.find((arg) => arg.startsWith('hiroshi:'))
  return value ? parseShellLink(value) : null
}
