/** Commands pass through a small IPC gate. The gate starts no user code until
 * its parent has installed containment. This closes the spawn/assign race. */
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import path from 'node:path'
import type { ExecutionLimits } from './protocol'
import { DEFAULT_EXECUTION_LIMITS } from './execution'

export interface OwnedProcess {
  pid: number
  stdout: ReadableStream<Uint8Array>
  stderr: ReadableStream<Uint8Array>
  exited: Promise<number>
  exitCode: number | null
  kill(signal?: string | number): void
  terminateTree(): void
}

/** Windows x64/arm64 ABI: BASIC_LIMIT=64, IO_COUNTERS=48, extended=144.
 * No breakaway flags; detached descendants inherit the job. The parent alone
 * owns its non-inheritable handle, so a parent crash kills the whole job. */
function windowsJob(pid: number, limits: ExecutionLimits): () => void {
  const { dlopen, FFIType: t } = require('bun:ffi') as typeof import('bun:ffi')
  const api = dlopen('kernel32.dll', {
    CreateJobObjectW: { args: [t.ptr, t.ptr], returns: t.ptr },
    SetInformationJobObject: { args: [t.ptr, t.i32, t.ptr, t.u32], returns: t.bool },
    AssignProcessToJobObject: { args: [t.ptr, t.ptr], returns: t.bool },
    OpenProcess: { args: [t.u32, t.bool, t.u32], returns: t.ptr },
    TerminateJobObject: { args: [t.ptr, t.u32], returns: t.bool },
    CloseHandle: { args: [t.ptr], returns: t.bool },
  })
  const job = api.symbols.CreateJobObjectW(null, null)
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    if (job) { api.symbols.TerminateJobObject(job, 125); api.symbols.CloseHandle(job) }
    api.close()
  }
  try {
    const data = Buffer.alloc(144)
    data.writeUInt32LE(0x2000 | 0x200 | 0x8, 16) // kill on close, job memory, active process limit
    data.writeUInt32LE(limits.maxProcesses, 40)
    data.writeBigUInt64LE(BigInt(limits.processMemoryMB) * 1048576n, 120)
    if (!job || !api.symbols.SetInformationJobObject(job, 9, data, data.length)) throw new Error('cannot install Windows process limits')
    const handle = api.symbols.OpenProcess(0x100 | 0x1, false, pid) // SET_QUOTA | TERMINATE
    if (!handle) throw new Error('cannot open the execution gate')
    try {
      if (!api.symbols.AssignProcessToJobObject(job, handle)) throw new Error('cannot contain the execution gate; command was not launched')
    } finally { api.symbols.CloseHandle(handle) }
    return close
  } catch (error) { close(); throw error }
}

/** Include engine-owned synchronous Git in an outer ceiling. The handle is
 * intentionally held for the daemon lifetime and closed by the OS on exit. */
let engineJob: (() => void) | undefined
export function containEngine(limits: ExecutionLimits): void {
  if (process.platform === 'win32' && !engineJob) engineJob = windowsJob(process.pid, {
    ...limits, maxProcesses: 1 + limits.maxActive * limits.maxProcesses,
    processMemoryMB: 512 + limits.maxActive * limits.processMemoryMB,
  })
}

export function spawnOwned(options: { cmd: string[]; cwd: string; input?: string; env?: Record<string, string | undefined>; limits?: ExecutionLimits }): OwnedProcess {
  const limits = options.limits ?? DEFAULT_EXECUTION_LIMITS
  const packaged = process.env.HIROSHI_PACKAGED_BUILD === '1'
  if (packaged ? !/^hiroshi-engine(?:\.exe)?$/i.test(path.basename(process.execPath)) : !/^bun(?:\.exe)?$/i.test(path.basename(process.execPath))) {
    throw new Error('commands require the engine runtime; refusing to launch a desktop executable')
  }
  const gateEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !['BUN_OPTIONS', 'NODE_OPTIONS'].includes(key.toUpperCase())))
  const child = spawn(process.execPath, packaged ? ['__execution-child'] : [path.join(import.meta.dir, 'exec-child.ts')], {
    // A workspace's runtime configuration must not preload code into the gate.
    cwd: path.dirname(process.execPath), env: gateEnv, detached: process.platform !== 'win32', windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], serialization: 'json',
  })
  let closeJob: (() => void) | undefined
  let code: number | null = null
  let failure: Error | undefined
  let monitor: ReturnType<typeof setInterval> | undefined
  const terminateTree = () => {
    if (process.platform === 'win32') {
      if (closeJob) closeJob()
      else child.kill('SIGKILL') // The gate has not received admission yet.
    } else {
      try { if (child.pid) process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }
  }
  const exited = new Promise<number>((resolve, reject) => {
    child.once('error', (error) => { failure = error; terminateTree(); reject(error) })
    // exit, rather than close: background descendants may still hold the pipes.
    child.once('exit', (exitCode) => { code = exitCode ?? 125; clearInterval(monitor); terminateTree(); failure ? reject(failure) : resolve(code) })
  })
  // An early spawn failure can occur before a consumer attaches its readers.
  void exited.catch(() => {})
  const handshake = setTimeout(() => { failure = new Error('execution gate did not become ready'); terminateTree() }, 5000)
  child.once('message', (message) => {
    clearTimeout(handshake)
    try {
      if (message !== 'ready' || !child.pid) throw new Error('invalid execution gate handshake')
      if (process.platform === 'win32') closeJob = windowsJob(child.pid, limits)
      else {
        // POSIX has no portable Job Object equivalent. These are sampled group
        // limits, not a hard ceiling and not containment of setsid escapees.
        monitor = setInterval(() => {
          try {
            const sample = Bun.spawnSync({ cmd: ['/bin/ps', '-axo', 'pgid=,rss='], stdout: 'pipe', stderr: 'ignore', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } })
            if (sample.exitCode !== 0) throw new Error('cannot monitor the command process group')
            const group = sample.stdout.toString().trim().split('\n').map((row) => row.trim().split(/\s+/).map(Number)).filter((row) => row[0] === child.pid)
            const memory = group.reduce((sum, row) => sum + (row[1] ?? 0), 0)
            if (group.length > limits.maxProcesses || memory > limits.processMemoryMB * 1024) throw new Error('command process group exceeded its monitored process or RAM limit')
          } catch (error) { failure = error as Error; terminateTree() }
        }, 500)
      }
      child.send({ cmd: options.cmd, cwd: options.cwd, input: options.input, env: options.env ?? process.env })
    } catch (error) { failure = error as Error; terminateTree() }
  })
  void exited.finally(() => clearTimeout(handshake)).catch(() => {})
  return { pid: child.pid!, stdout: Readable.toWeb(child.stdout!) as unknown as ReadableStream<Uint8Array>,
    stderr: Readable.toWeb(child.stderr!) as unknown as ReadableStream<Uint8Array>, exited,
    get exitCode() { return code }, kill: terminateTree, terminateTree }
}

/** Internal helper only; no daemon, UI, or command until one IPC admission. */
export async function runProcessChild(): Promise<never> {
  if (!process.send) process.exit(126)
  const orphan = () => {
    if (process.platform !== 'win32') { try { process.kill(-process.pid, 'SIGKILL') } catch {} }
    process.exit(125)
  }
  process.once('disconnect', orphan)
  const timer = setTimeout(() => process.exit(126), 5000)
  process.once('message', async (message: any) => {
    clearTimeout(timer)
    if (!message || !Array.isArray(message.cmd) || !message.cmd.length || !message.cmd.every((arg: unknown) => typeof arg === 'string')) process.exit(126)
    try {
      if (message.input !== undefined && (typeof message.input !== 'string' || Buffer.byteLength(message.input) > 256 * 1024)) process.exit(126)
      const proc = Bun.spawn({ cmd: message.cmd, cwd: message.cwd, env: message.env,
        stdin: message.input === undefined ? 'ignore' : Buffer.from(message.input), stdout: 'inherit', stderr: 'inherit', windowsHide: true })
      process.exit(await proc.exited)
    } catch { process.stderr.write('hiroshi-engine: command could not start\n'); process.exit(127) }
  })
  process.send!('ready')
  return new Promise<never>(() => {})
}
