/** Bounded workspace reads and Git facts shared by surfaces and tools. */
import { createHash } from 'node:crypto'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { spawnOwned } from './process'
import { invalid, notFound } from './errors'
import type { FileChange, WorkspaceDirectory, WorkspaceFile, WorkspaceReview } from './protocol'

const LIMIT = 256 * 1024
function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}
export class WorkspaceFiles {
  constructor(readonly cwd: string, readonly home?: string) {}
  async resolve(requested: string): Promise<string> {
    if (typeof requested !== 'string' || requested.includes('\0')) throw invalid('workspace_path', 'a workspace path is required')
    const root = await realpath(this.cwd)
    const target = path.resolve(root, requested || '.')
    if (!inside(root, target) || path.relative(root, target).split(path.sep).some((part) => part.toLowerCase() === '.git')) throw invalid('workspace_path', 'path must remain inside the workspace and outside Git metadata')
    let resolved: string
    try { resolved = await realpath(target) } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw notFound('workspace path')
      throw error
    }
    if (!inside(root, resolved) || path.relative(root, resolved).split(path.sep).some((part) => part.toLowerCase() === '.git')) throw invalid('workspace_path', 'path must remain inside the workspace and outside Git metadata')
    if (this.home) {
      const home = await realpath(this.home)
      if (home !== root && inside(root, home) && inside(home, resolved)) throw invalid('workspace_path', 'engine data is outside the workspace surface')
      if (home === root && /^(engine\.(db.*|json|lock)|logs|checkpoints|tool-results|providers\.json|tools\.json)([\\/]|$)/i.test(path.relative(root, resolved))) throw invalid('workspace_path', 'engine data is outside the workspace surface')
    }
    return resolved
  }
  async list(requested = ''): Promise<WorkspaceDirectory> {
    const target = await this.resolve(requested)
    const all = await readdir(target, { withFileTypes: true })
    all.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    const entries: WorkspaceDirectory['entries'] = []
    for (const item of all) {
      if (item.name.toLowerCase() === '.git') continue
      const name = path.posix.join(requested.split(path.sep).join('/'), item.name)
      try {
        if (!item.isSymbolicLink()) await this.resolve(name)
        const info = await lstat(path.join(target, item.name))
        entries.push({ path: name, name: item.name, kind: item.isSymbolicLink() ? 'symlink' : item.isDirectory() ? 'directory' : 'file', bytes: info.size })
      } catch { continue }
      if (entries.length >= 500) break
    }
    return { path: requested, entries, truncated: entries.length === 500 && all.length > 500 }
  }
  async file(requested: string): Promise<WorkspaceFile> {
    const target = await this.resolve(requested)
    if (!(await lstat(target)).isFile()) throw invalid('workspace_file', 'choose a regular workspace file')
    const file = await open(target, 'r')
    try {
      const info = await file.stat()
      if (!info.isFile()) throw invalid('workspace_file', 'choose a regular workspace file')
      const bytes = Buffer.alloc(Math.min(info.size, LIMIT + 1))
      const { bytesRead } = await file.read(bytes, 0, bytes.length, 0)
      const content = bytes.subarray(0, Math.min(bytesRead, LIMIT))
      let text = '', binary = content.includes(0)
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(content, { stream: info.size > LIMIT }) } catch { binary = true }
      return { digest: createHash('sha256').update(content).digest('hex'), path: requested, bytes: info.size, text: binary ? '' : text, binary, truncated: info.size > LIMIT }
    } finally { await file.close() }
  }
}

let activeGit = 0
const waitingGit: (() => void)[] = []
/** Git for Windows can itself spawn another Git process. Bound concurrent
 * reads across all cockpit windows rather than multiplying process bursts. */
export async function git(cwd: string, args: string[], limit = 1024 * 1024) {
  if (activeGit >= 2) await new Promise<void>((resolve) => waitingGit.push(resolve))
  else activeGit++
  try { return await runGit(cwd, args, limit) }
  finally { const next = waitingGit.shift(); if (next) next(); else activeGit-- }
}
async function runGit(cwd: string, args: string[], limit: number) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')))
  const proc = spawnOwned({ cmd: ['git', '-c', 'core.fsmonitor=false', '-C', cwd, ...args], cwd, env: { ...env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } })
  let truncated = false
  const hash = createHash('sha256')
  const timer = setTimeout(() => { truncated = true; proc.kill() }, 8000)
  const collect = async (stream: ReadableStream<Uint8Array>, digest: boolean) => {
    const chunks: Uint8Array[] = []; let count = 0
    const reader = stream.getReader()
    try { for (;;) {
      const next = await reader.read(); if (next.done) break
      if (digest) hash.update(next.value)
      const room = Math.max(0, limit - count)
      if (room) chunks.push(next.value.subarray(0, room))
      count += next.value.length
      if (count > limit) truncated = true
    } } finally { reader.releaseLock() }
    return Buffer.concat(chunks)
  }
  try {
    const [stdout, stderr, code] = await Promise.all([collect(proc.stdout, true), collect(proc.stderr, false), proc.exited])
    return { stdout, stderr, code, truncated, digest: hash.digest('hex') }
  } finally { clearTimeout(timer); proc.terminateTree() }
}

export async function reviewWorkspace(cwd: string, requestedBase?: string): Promise<WorkspaceReview> {
  const rootResult = await git(cwd, ['rev-parse', '--show-toplevel'])
  const empty: WorkspaceReview = { available: false, reason: 'This workspace is not a Git repository.', root: cwd, branch: '', base: '', baseCommit: '', revision: '', files: [], patch: '', stagedPatch: '', workingPatch: '', truncated: false }
  if (rootResult.code !== 0) return empty
  const root = rootResult.stdout.toString().trim()
  if (await realpath(root) !== await realpath(cwd)) return { ...empty, reason: 'Open the repository root to review and commit this workspace.' }
  const checked = async (args: string[]) => {
    const result = await git(cwd, args)
    if (result.code !== 0) throw invalid('workspace_git', 'Git could not read the workspace review')
    return result
  }
  const branchResult = await git(cwd, ['symbolic-ref', '--short', '-q', 'HEAD'])
  const branch = branchResult.stdout.toString().trim() || 'Detached HEAD'
  const head = (await git(cwd, ['rev-parse', '--verify', 'HEAD'])).stdout.toString().trim()
  const resolve = async (ref: string) => (await git(cwd, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])).stdout.toString().trim()
  let base = requestedBase
  if (base !== undefined && (typeof base !== 'string' || !base.trim() || base.length > 256)) throw invalid('workspace_base', 'base must name a Git commit or ref')
  if (!base) {
    const remote = (await git(cwd, ['symbolic-ref', '-q', 'refs/remotes/origin/HEAD'])).stdout.toString().trim()
    base = remote || (branch !== 'main' && await resolve('refs/heads/main') ? 'refs/heads/main' : branch !== 'master' && await resolve('refs/heads/master') ? 'refs/heads/master' : 'HEAD')
  }
  let baseCommit = head ? await resolve(base) : ''
  if (head && !baseCommit) throw invalid('workspace_base', 'the review base does not resolve to a commit')
  if (head && baseCommit) baseCommit = (await checked(['merge-base', head, baseCommit])).stdout.toString().trim()
  if (!head) { base = 'Empty repository'; baseCommit = (await checked(['hash-object', '-t', 'tree', '--stdin'])).stdout.toString().trim() }
  const [names, status, patch, staged, working] = await Promise.all([
    checked(['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '--find-renames', baseCommit, '--', '.']),
    checked(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.']),
    checked(['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--find-renames', baseCommit, '--', '.']),
    checked(['diff', '--cached', '--no-ext-diff', '--no-textconv', '--no-color', '--', '.']),
    checked(['diff', '--no-ext-diff', '--no-textconv', '--no-color', ...(head ? [head] : [baseCommit]), '--', '.']),
  ])
  const files = new Map<string, FileChange>()
  const fields = names.stdout.toString().split('\0')
  for (let i = 0; i < fields.length && fields[i];) {
    const state = fields[i++]!; const first = fields[i++]!
    const renamed = /^[RC]/.test(state); const name = renamed ? fields[i++]! : first
    files.set(name, { path: name, ...(renamed ? { previousPath: first } : {}), status: state[0]!, staged: false, unstaged: false })
  }
  let fullPatch = patch.stdout.toString(), untrackedPatch = ''
  const fingerprint = createHash('sha256').update(head).update(baseCommit).update(status.stdout).update(patch.digest).update(staged.digest)
  let truncated = names.truncated || status.truncated || patch.truncated || staged.truncated || working.truncated
  const records = status.stdout.toString().split('\0')
  for (let i = 0; i < records.length && records[i]; i++) {
    const record = records[i]!, state = record.slice(0, 2), name = record.slice(3)
    const old = /[RC]/.test(state) ? records[++i] : undefined
    const prior = files.get(name)
    files.set(name, { path: name, ...(old ? { previousPath: old } : prior?.previousPath ? { previousPath: prior.previousPath } : {}),
      status: ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(state) ? 'U' : prior?.status ?? (state === '??' ? '?' : state.trim()[0] ?? 'M'), staged: state[0] !== ' ' && state !== '??', unstaged: state[1] !== ' ' })
    if (state === '??') {
      if (fullPatch.length + untrackedPatch.length >= LIMIT || files.size > 2000) { truncated = true; fingerprint.update(name); continue }
      const info = await lstat(path.join(cwd, name)).catch(() => null)
      if (info?.isSymbolicLink()) {
        truncated = true
        untrackedPatch += `\nUntracked symbolic link: ${name} (review with Git)\n`
        continue
      }
      const file = await new WorkspaceFiles(cwd).file(name).catch(() => null)
      if (!file || file.binary || file.truncated || fullPatch.length + untrackedPatch.length > LIMIT) {
        fingerprint.update(name).update(file?.digest ?? '').update(String(file?.bytes ?? -1))
        untrackedPatch += `\nUntracked file: ${name}${file?.binary ? ' (binary)' : ' (preview unavailable)'}\n`
        if (!file || file.truncated) truncated = true
      } else {
        fingerprint.update(name).update(file.text)
        const quote = (value: string) => JSON.stringify(value)
        const lines = file.text ? (file.text.endsWith('\n') ? file.text.slice(0, -1) : file.text).split('\n') : []
        const mode = process.platform !== 'win32' && ((await lstat(path.join(cwd, name))).mode & 0o111) ? '100755' : '100644'
        untrackedPatch += `\ndiff --git ${quote('a/' + name)} ${quote('b/' + name)}\nnew file mode ${mode}\n`
        if (lines.length) untrackedPatch += `--- /dev/null\n+++ ${quote('b/' + name)}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => '+' + line).join('\n')}\n${file.text.endsWith('\n') ? '' : '\\ No newline at end of file\n'}`
      }
    }
  }
  fullPatch += untrackedPatch
  const workingPatch = working.stdout.toString() + untrackedPatch
  if (workingPatch.length > LIMIT) truncated = true
  if (fullPatch.length > LIMIT) { fullPatch = fullPatch.slice(0, LIMIT) + '\n[Diff preview truncated]'; truncated = true }
  return { available: true, reason: null, root, branch, base, baseCommit, revision: fingerprint.digest('hex'), files: [...files.values()].slice(0, 2000), patch: fullPatch, stagedPatch: staged.stdout.toString().slice(0, LIMIT), workingPatch: workingPatch.slice(0, LIMIT), truncated: truncated || files.size > 2000 }
}
