/** Real HTTP, SQLite, providers and subprocesses; no desktop launches. */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { startDaemon, tempHome, until, sleep } from './harness'
import { spawnOwned } from '../src/process'
import { DEFAULT_EXECUTION_LIMITS } from '../src/execution'

function config(home: string, limits = {}) {
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, queueTimeoutMs: 30000, ...limits }))
}
const frame = (value: object) => `data: ${JSON.stringify(value)}\n\n`

describe('bounded daemon execution', () => {
  test('a real HTTP provider, shell tool and follow-up share one slot with a direct command', async () => {
    const home = tempHome(); config(home)
    writeFileSync(join(home, 'tools.json'), JSON.stringify({ rules: [{ tool: 'shell', action: 'allow' }] }))
    let requests = 0
    const provider = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
      const body = await request.json() as any
      requests++
      const output = body.input?.some((item: any) => item.type === 'function_call_output')
      const events = output ? [{ type: 'response.output_text.delta', delta: 'Verified the command output.' }] : [
        { type: 'response.output_item.added', item: { type: 'function_call', id: 'item_1', call_id: 'call_1', name: 'shell' } },
        { type: 'response.function_call_arguments.delta', item_id: 'item_1', delta: JSON.stringify({ command: 'echo budget-tool' }) },
        { type: 'response.output_item.done', item: { type: 'function_call', id: 'item_1', call_id: 'call_1', name: 'shell' } },
      ]
      await sleep(150)
      return new Response([...events, { type: 'response.completed' }].map(frame).join(''), { headers: { 'content-type': 'text/event-stream' } })
    } })
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/chat', providers: [{ id: 'fixture', adapter: 'openai', baseURL: provider.url.href,
      apiKeyEnv: 'HIROSHI_FIXTURE_KEY', models: [{ id: 'chat', model: 'chat', label: 'Fixture', contextWindow: 32768, reservedOutput: 1024 }] }] }))
    const daemon = await startDaemon({ home, env: { HIROSHI_FIXTURE_KEY: 'fixture-only' } })
    try {
      const { session: a } = await daemon.client.createSession({ title: 'model' })
      const { session: b } = await daemon.client.createSession({ title: 'command' })
      await daemon.client.prompt({ id: a.id, text: 'Run the tool and report its output.' })
      await until(async () => (await daemon.client.session({ id: a.id })).executions?.some((item) => item.state === 'running') ?? false)
      const { run: command } = await daemon.client.startRun({ id: b.id, command: 'echo direct-command' })
      await until(async () => (await daemon.client.session({ id: a.id })).messages.some((message) => message.text === 'Verified the command output.'), 15000)
      await until(async () => (await daemon.client.run({ id: command.id })).run.status === 'succeeded')
      const detail = await daemon.client.session({ id: a.id })
      expect(requests).toBe(2)
      expect(detail.toolCalls[0]?.status).toBe('succeeded')
      expect(detail.toolCalls[0]?.output).toContain('budget-tool')
      const all = [...detail.executions!, ...(await daemon.client.session({ id: b.id })).executions!]
        .filter((value) => value.startedAt !== null).sort((a, b) => a.startedAt! - b.startedAt!)
      expect(all.filter((value) => value.kind !== 'maintenance').map((value) => value.kind).sort()).toEqual(['command', 'model', 'model', 'tool'])
      for (let index = 1; index < all.length; index++) expect(all[index]!.startedAt!).toBeGreaterThanOrEqual(all[index - 1]!.endedAt!)
      expect((await daemon.client.health()).execution?.limits.maxActive).toBe(1)
    } finally { await daemon.stop(); provider.stop(true) }
  }, 25000)

  test('queued cancellation and daemon crash never launch cancelled work or replay a claimed command', async () => {
    const home = tempHome(); config(home)
    let daemon = await startDaemon({ home })
    try {
      const { session: a } = await daemon.client.createSession({ title: 'hold' })
      const { session: b } = await daemon.client.createSession({ title: 'wait' })
      const holdCommand = process.platform === 'win32' ? 'Start-Sleep -Seconds 20' : 'sleep 20'
      const { run: active } = await daemon.client.startRun({ id: a.id, command: holdCommand })
      await until(async () => (await daemon.client.session({ id: a.id })).executions?.some((item) => item.state === 'running') ?? false)
      const { run: cancelled } = await daemon.client.startRun({ id: b.id, command: 'echo should-never-start' })
      await daemon.client.cancelRun({ id: cancelled.id })
      const { run: queued } = await daemon.client.startRun({ id: b.id, command: 'echo recovered-once' })
      const before = (await daemon.client.session({ id: b.id })).executions!.find((item) => item.id === queued.id)!
      expect(before.state).toBe('queued')
      await daemon.crash()
      daemon = await startDaemon({ home })
      await until(async () => (await daemon.client.run({ id: queued.id })).run.status === 'succeeded')
      expect((await daemon.client.run({ id: active.id })).run.status).toBe('interrupted')
      expect((await daemon.client.run({ id: cancelled.id })).run.status).toBe('cancelled')
      const detail = await daemon.client.session({ id: b.id })
      expect(detail.executions!.find((item) => item.id === queued.id)?.queueDeadline).toBe(before.queueDeadline)
      expect(detail.executions!.find((item) => item.id === cancelled.id)?.startedAt).toBeNull()
      expect(detail.chunks.filter((chunk) => chunk.runID === queued.id).map((chunk) => chunk.data).join('').replaceAll('\r\n', '\n')).toBe('recovered-once\n')
    } finally { await daemon.stop() }
  }, 25000)

  test('a direct command deadline kills the process and releases capacity', async () => {
    const home = tempHome(); config(home, { timeoutMs: 1500 })
    const daemon = await startDaemon({ home })
    try {
      const { session } = await daemon.client.createSession({ title: 'deadline' })
      const { run: command } = await daemon.client.startRun({ id: session.id, command: process.platform === 'win32' ? 'Start-Sleep -Seconds 20' : 'sleep 20' })
      await until(async () => (await daemon.client.run({ id: command.id })).run.status === 'failed')
      const detail = await daemon.client.session({ id: session.id })
      expect(detail.runs[0]?.error).toContain('deadline')
      await until(async () => (await daemon.client.health()).execution?.active === 0)
    } finally { await daemon.stop() }
  }, 15000)
})

describe('contained process trees', () => {
  test('an abrupt owner crash cleans the command gate and its descendants', async () => {
    const home = tempHome(), marker = join(home, 'descendant-pid'), ready = join(home, 'gate-pid'), owner = join(home, 'owner.ts')
    const command = `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:${process.platform === 'win32'},stdio:['ignore','ignore','ignore']}); await Bun.write(${JSON.stringify(marker)},String(child.pid)); child.unref(); setInterval(()=>{},1000);`
    writeFileSync(owner, `import {spawnOwned} from ${JSON.stringify(pathToFileURL(join(import.meta.dir, '../src/process.ts')).href)}; const proc=spawnOwned({cmd:[process.execPath,'-e',${JSON.stringify(command)}],cwd:${JSON.stringify(home)}}); await Bun.write(${JSON.stringify(ready)},String(proc.pid)); await proc.exited;`)
    const proc = Bun.spawn({ cmd: [process.execPath, owner], stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true })
    try {
      await until(() => existsSync(marker) && existsSync(ready))
      const pids = [Number(readFileSync(marker, 'utf8')), Number(readFileSync(ready, 'utf8'))]
      proc.kill('SIGKILL'); await proc.exited
      for (const pid of pids) await until(() => {
        try {
          process.kill(pid, 0)
          return process.platform === 'linux' && readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1]?.startsWith('Z') === true
        } catch { return true }
      }, 5000)
      expect(pids.every((pid) => pid > 0)).toBe(true)
    } finally { if (proc.exitCode === null) proc.kill('SIGKILL') }
  }, 15000)

  test('leader exit cleans a background descendant, including Windows detached children', async () => {
    const home = tempHome(), marker = join(home, 'child-pid')
    const script = `const {spawn}=require('node:child_process'); const child = spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:${process.platform === 'win32'},stdio:['ignore','ignore','ignore']}); await Bun.write(${JSON.stringify(marker)},String(child.pid)); child.unref();`
    const proc = spawnOwned({ cmd: [process.execPath, '-e', script], cwd: home })
    try {
      expect(await proc.exited).toBe(0)
      expect(existsSync(marker)).toBe(true)
      const pid = Number(readFileSync(marker, 'utf8'))
      await until(() => {
        try {
          process.kill(pid, 0)
          return process.platform === 'linux' && readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1]?.startsWith('Z') === true
        } catch { return true }
      }, 5000)
    } finally { proc.terminateTree() }
  }, 10000)

  test.skipIf(process.platform !== 'win32')('Windows refuses a third process at a two-process job ceiling', async () => {
    const script = `
      const {dlopen,FFIType:t}=require('bun:ffi');
      const api=dlopen('kernel32.dll',{
        CreateProcessW:{args:[t.ptr,t.ptr,t.ptr,t.ptr,t.bool,t.u32,t.ptr,t.ptr,t.ptr,t.ptr],returns:t.bool},
        TerminateProcess:{args:[t.ptr,t.u32],returns:t.bool},CloseHandle:{args:[t.ptr],returns:t.bool}
      });
      const startup=Buffer.alloc(104);startup.writeUInt32LE(104);const info=Buffer.alloc(24);
      const exe=Buffer.from(process.execPath+'\\0','utf16le'),cmd=Buffer.from('"'+process.execPath+'" -e "process.exit(0)"\\0','utf16le');
      const started=api.symbols.CreateProcessW(exe,cmd,null,null,false,0x08000004,null,null,startup,info);
      if(started){const p=Number(info.readBigUInt64LE(0)),thread=Number(info.readBigUInt64LE(8));api.symbols.TerminateProcess(p,125);api.symbols.CloseHandle(p);api.symbols.CloseHandle(thread);process.exit(9)}
      process.stdout.write('process-limit-enforced');api.close();`
    const proc = spawnOwned({ cmd: [process.execPath, '-e', script], cwd: process.cwd(), limits: { ...DEFAULT_EXECUTION_LIMITS, maxProcesses: 2 } })
    try { const output = await new Response(proc.stdout).text(); expect(await proc.exited).toBe(0); expect(output).toContain('process-limit-enforced') }
    finally { proc.terminateTree() }
  }, 10000)
})
