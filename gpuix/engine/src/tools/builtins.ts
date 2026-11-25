import { lstat, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { WorkspaceFiles } from '../workspace'
import { killTree } from '../runs'
import { spawnOwned } from '../process'
import type { ExecutionLimits } from '../protocol'
import type { ToolRegistry } from './registry'

/** Resolve real paths, including junctions. File tools only address the
 * workspace; the shell is explicitly a command with the account's privileges. */
async function filePath(cwd: string, requested: string, writing: boolean): Promise<string> {
  const root = await realpath(cwd)
  const target = path.resolve(root, requested)
  const resolved = writing ? path.join(await realpath(path.dirname(target)), path.basename(target)) : await realpath(target)
  const relative = path.relative(root, resolved)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('file path must remain inside the workspace')
  }
  if (writing) {
    try {
      const info = await lstat(resolved)
      if (info.isSymbolicLink() || !info.isFile()) throw new Error('write_file needs a regular file or a new file')
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  return resolved
}

const fileInput = { type: 'object', properties: { path: { type: 'string', minLength: 1, maxLength: 4096 } }, required: ['path'], additionalProperties: false }
const fileOutput = { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'], additionalProperties: false }

export function registerBuiltins(registry: ToolRegistry, home?: string, limits?: ExecutionLimits): void {
  registry.register({ name: 'list_files', accessKind: 'read', version: '1', description: 'List a workspace directory using the same tree as the Files surface.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', maxLength: 4096 } }, additionalProperties: false },
    outputSchema: { type: 'object', properties: { path: { type: 'string' }, truncated: { type: 'boolean' }, entries: { type: 'array', items: {
      type: 'object', properties: { path: { type: 'string' }, name: { type: 'string' }, kind: { type: 'string', enum: ['file', 'directory', 'symlink'] }, bytes: { type: 'integer', minimum: 0 } },
      required: ['path', 'name', 'kind', 'bytes'], additionalProperties: false } } }, required: ['path', 'truncated', 'entries'], additionalProperties: false },
    async run(input, context) { context.signal.throwIfAborted(); return new WorkspaceFiles(context.cwd, home).list(input.path ?? '') },
  })
  registry.register({ name: 'read_file', accessKind: 'read', version: '1', description: 'Read a UTF-8 file inside the workspace.',
    inputSchema: fileInput, outputSchema: fileOutput,
    async run(input, context) {
      context.signal.throwIfAborted()
      const file = await filePath(context.cwd, input.path, false)
      const info = await stat(file)
      if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('read_file accepts regular files up to 16 MiB')
      return { path: input.path, content: await readFile(file, { encoding: 'utf8', signal: context.signal }) }
    },
  })
  registry.register({ name: 'write_file', accessKind: 'edit', version: '1', description: 'Create or replace a UTF-8 file inside the workspace. Its parent directory must exist.',
    inputSchema: { ...fileInput, properties: { ...fileInput.properties, content: { type: 'string', maxLength: 16 * 1024 * 1024 } }, required: ['path', 'content'] },
    outputSchema: { type: 'object', properties: { path: { type: 'string' }, bytes: { type: 'integer', minimum: 0 } }, required: ['path', 'bytes'], additionalProperties: false },
    async run(input, context) {
      const file = await filePath(context.cwd, input.path, true)
      const temporary = path.join(path.dirname(file), `.hiroshi-${randomUUID()}.tmp`)
      context.signal.throwIfAborted()
      try {
        await writeFile(temporary, input.content, { flag: 'wx', mode: 0o600, signal: context.signal })
        context.signal.throwIfAborted()
        await rename(temporary, file)
        return { path: input.path, bytes: Buffer.byteLength(input.content, 'utf8') }
      } finally { await unlink(temporary).catch(() => {}) }
    },
  })
  registry.register({ name: 'shell', accessKind: 'command', version: '1', description: 'Run a shell command in the workspace with your account permissions. This can modify files and access the network.',
    inputSchema: { type: 'object', properties: { command: { type: 'string', minLength: 1, maxLength: 16384 }, timeoutMs: { type: 'integer', minimum: 1, maximum: 120000 } }, required: ['command'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { stdout: { type: 'string' }, stderr: { type: 'string' }, exitCode: { type: 'integer' } }, required: ['stdout', 'stderr', 'exitCode'], additionalProperties: false },
    async run(input, context) {
      context.signal.throwIfAborted()
      const { resolveShell } = await import('../shell')
      const shell = resolveShell()
      context.signal.throwIfAborted()
      // Do not hand provider credentials to model-started subprocesses.
      const env: Record<string, string> = {}
      for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LANG', 'LC_ALL']) {
        if (process.env[key]) env[key] = process.env[key]!
      }
      const proc = spawnOwned({ cmd: [...shell.argv, input.command], cwd: context.cwd, env, limits })
      let stopped = false
      const stop = () => { stopped = true; killTree(proc) }
      context.signal.addEventListener('abort', stop, { once: true })
      if (context.signal.aborted) stop()
      const timer = setTimeout(stop, input.timeoutMs ?? 30000)
      let bytes = 0
      const collect = async (stream: ReadableStream<Uint8Array>) => {
        const chunks: Uint8Array[] = []
        const reader = stream.getReader()
        try {
          for (;;) {
            const next = await reader.read()
            if (next.done) break
            bytes += next.value.length
            if (bytes > 32 * 1024 * 1024) { stop(); throw new Error('shell output exceeded 32 MiB') }
            chunks.push(next.value)
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
        return Buffer.concat(chunks).toString('utf8')
      }
      try {
        const [stdout, stderr, exitCode] = await Promise.all([collect(proc.stdout), collect(proc.stderr), proc.exited])
        if (stopped) throw new Error('the shell command was interrupted or timed out')
        return { stdout, stderr, exitCode }
      } finally {
        clearTimeout(timer)
        context.signal.removeEventListener('abort', stop)
        if (proc.exitCode === null) killTree(proc)
      }
    },
  })
}
