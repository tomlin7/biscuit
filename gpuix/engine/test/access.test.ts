import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { accessFixture } from './access-fixture'
import { startDaemon, tempHome, until } from './harness'
import type { AccessMode } from '../src/protocol'

async function setup(limits: Record<string, number> = {}) {
  const home = tempHome(), cwd = join(home, 'project'); mkdirSync(cwd)
  if (Bun.spawnSync(['git', '-C', cwd, 'init', '-b', 'main']).exitCode) throw new Error('fixture Git init failed')
  const fixture = accessFixture()
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/tools', providers: [fixture.provider] }))
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, minFreeMemoryMB: 128, processMemoryMB: 512, maxProcesses: 4, timeoutMs: 30000, ...limits }))
  const start = () => startDaemon({ home, workspace: cwd, env: { HIROSHI_ACCESS_TEST_KEY: 'local-fixture' } })
  const daemon = await start(), { session } = await daemon.client.createSession({})
  return { home, cwd, fixture, daemon, start, id: session.id }
}
const command = (tool: string, input: object) => JSON.stringify({ tool, input })
const write = (path: string) => command('write_file', { path, content: `real contents: ${path}` })
const change = async (f: Awaited<ReturnType<typeof setup>>, mode: AccessMode) => f.daemon.client.updateAccess({ id: f.id, mode, revision: (await f.daemon.client.session({ id: f.id })).access!.revision })
async function pending(f: Awaited<ReturnType<typeof setup>>) {
  await until(async () => (await f.daemon.client.session({ id: f.id })).permissions.some((p) => p.state === 'pending'))
  return (await f.daemon.client.session({ id: f.id })).permissions.find((p) => p.state === 'pending')!
}
async function done(f: Awaited<ReturnType<typeof setup>>, count = 1) {
  await until(async () => { const d = await f.daemon.client.session({ id: f.id }); return d.toolCalls.filter((c) => !!c.resultMessageID).length >= count && d.steps.at(-1)?.status === 'succeeded' && d.messages.at(-1)?.role === 'assistant' }, 15000)
}

test('permission mode is task-scoped, compare-and-set, validated, and durable across a real daemon restart', async () => {
  const f = await setup()
  try {
    expect((await f.daemon.client.session({ id: f.id })).access).toEqual({ mode: 'ask', revision: 0 })
    const { session: other } = await f.daemon.client.createSession({})
    await change(f, 'edits')
    await expect(f.daemon.client.updateAccess({ id: f.id, mode: 'full', revision: 0 })).rejects.toMatchObject({ code: 'access_revision' })
    await expect(f.daemon.client.updateAccess({ id: f.id, mode: 'invalid' as AccessMode, revision: 1 })).rejects.toMatchObject({ code: 'access_mode' })
    await f.daemon.crash(); f.daemon = await f.start()
    expect((await f.daemon.client.session({ id: f.id })).access).toEqual({ mode: 'edits', revision: 1 })
    expect((await f.daemon.client.session({ id: other.id })).access).toEqual({ mode: 'ask', revision: 0 })
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('Supervised waits before writing; switching to Full does not silently answer an outstanding question', async () => {
  const f = await setup()
  try {
    await f.daemon.client.prompt({ id: f.id, text: write('reviewed.txt') })
    const question = await pending(f)
    expect(existsSync(join(f.cwd, 'reviewed.txt'))).toBe(false)
    await change(f, 'full')
    expect((await f.daemon.client.session({ id: f.id })).permissions[0]?.state).toBe('pending')
    await f.daemon.client.answerPermission({ id: question.id, decision: 'allow', remember: false })
    await done(f)
    expect(readFileSync(join(f.cwd, 'reviewed.txt'), 'utf8')).toBe('real contents: reviewed.txt')
    expect(f.fixture.reviews).toHaveLength(0)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('Auto-accept edits writes ordinary files; commands and protected files still ask', async () => {
  const f = await setup()
  try {
    await change(f, 'edits')
    await f.daemon.client.prompt({ id: f.id, text: write('safe.txt') }); await done(f)
    expect(existsSync(join(f.cwd, 'safe.txt'))).toBe(true)
    await f.daemon.client.prompt({ id: f.id, text: command('shell', { command: 'echo should-ask' }) })
    const shell = await pending(f); expect(shell.tool).toBe('shell')
    await f.daemon.client.answerPermission({ id: shell.id, decision: 'deny', remember: false }); await done(f, 2)
    await f.daemon.client.prompt({ id: f.id, text: write('AGENTS.md') })
    const edit = await pending(f); expect(edit.tool).toBe('write_file')
    expect(existsSync(join(f.cwd, 'AGENTS.md'))).toBe(false)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 25000)

test('Full access executes a real shell and write once without questions; explicit repository/user gates remain binding', async () => {
  const f = await setup()
  try {
    await change(f, 'full')
    const request = { id: f.id, key: 'once', text: command('shell', { command: 'echo approved-full-command' }) }
    await f.daemon.client.prompt(request); await f.daemon.client.prompt(request); await done(f)
    const first = await f.daemon.client.session({ id: f.id })
    expect(first.toolCalls).toHaveLength(1); expect(first.toolCalls[0]?.output).toContain('approved-full-command')
    expect(first.permissions).toHaveLength(0)
    writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: 'write_file', action: 'deny' }] }))
    await f.daemon.client.prompt({ id: f.id, text: write('denied.txt') }); await done(f, 2)
    expect(existsSync(join(f.cwd, 'denied.txt'))).toBe(false)
    mkdirSync(join(f.cwd, '.hiroshi'))
    writeFileSync(join(f.cwd, '.hiroshi', 'tools.json'), JSON.stringify({ alwaysAsk: true }))
    await f.daemon.client.prompt({ id: f.id, text: command('shell', { command: 'echo must-ask' }) })
    expect((await pending(f)).tool).toBe('shell')
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 25000)

test('Auto uses an independent bounded model review, records its usage, then executes the actual approved edit', async () => {
  const f = await setup()
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('auto.txt') }); await done(f)
    const d = await f.daemon.client.session({ id: f.id })
    expect(d.accessReviews?.[0]).toMatchObject({ status: 'allow', model: 'fixture/tools', usage: { inputTokens: 13, outputTokens: 4 } })
    expect(d.toolCalls[0]?.decisionSource).toBe('reviewer')
    expect(existsSync(join(f.cwd, 'auto.txt'))).toBe(true)
    expect(f.fixture.reviews).toHaveLength(1)
    expect(f.fixture.reviews[0].tools ?? []).toHaveLength(0)
    expect(f.fixture.reviews[0].max_output_tokens).toBe(1024)
    const usage = await f.daemon.client.usageReport({ id: f.id, from: Date.now() - 86400000, to: Date.now() + 1000, includeHistory: false })
    expect(usage.totals.attempts).toBe(3)
    expect(usage.totals.input).toBe(43)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

for (const review of ['ask', 'invalid', 'error', 'tool'] as const) test(`Auto ${review} review falls back to an operator question without effects or raw diagnostic leakage`, async () => {
  const f = await setup(); f.fixture.setReview(review)
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('uncertain.txt') }); await pending(f)
    const d = await f.daemon.client.session({ id: f.id })
    expect(d.accessReviews?.[0]?.status).toBe('ask')
    expect(existsSync(join(f.cwd, 'uncertain.txt'))).toBe(false)
    expect(JSON.stringify(d)).not.toContain('private-fixture-secret')
    expect(f.fixture.reviews).toHaveLength(1)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('a crash during Auto review asks after restart without replaying the review or starting a file effect', async () => {
  const f = await setup(); f.fixture.setReview('hold')
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('restart.txt') })
    await until(() => f.fixture.reviews.length === 1)
    await f.daemon.crash(); f.fixture.releaseReview(); f.daemon = await f.start()
    await pending(f)
    expect(f.fixture.reviews).toHaveLength(1)
    expect(existsSync(join(f.cwd, 'restart.txt'))).toBe(false)
    expect((await f.daemon.client.session({ id: f.id })).accessReviews?.[0]?.reason).toContain('not replayed')
  } finally { f.fixture.releaseReview(); await f.daemon.stop(); f.fixture.server.stop(true) }
}, 25000)

for (const revoke of ['mode', 'policy'] as const) test(`revoking a ${revoke} allowance while a tool waits for capacity prevents its effect at admission`, async () => {
  const f = await setup(); f.fixture.holdTurns()
  try {
    if (revoke === 'mode') await change(f, 'full')
    else writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: 'write_file', action: 'allow' }] }))
    await f.daemon.client.prompt({ id: f.id, text: write('revoked.txt') })
    await until(() => f.fixture.requests.length === 1)
    const { run } = await f.daemon.client.startRun({ id: f.id, command: process.platform === 'win32' ? 'Start-Sleep -Seconds 20' : 'sleep 20' })
    f.fixture.releaseTurn()
    await until(async () => (await f.daemon.client.session({ id: f.id })).executions!.some((e) => e.kind === 'tool' && e.state === 'queued'))
    if (revoke === 'mode') await change(f, 'ask')
    else writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: 'write_file', action: 'ask' }] }))
    await f.daemon.client.cancelRun({ id: run.id })
    await done(f)
    const d = await f.daemon.client.session({ id: f.id })
    const edit = d.toolCalls.find((call) => call.tool === 'write_file')
    expect(edit?.status).toBe('failed')
    expect(edit?.error).toContain('changed while queued')
    expect(existsSync(join(f.cwd, 'revoked.txt'))).toBe(false)
  } finally { f.fixture.releaseTurn(); await f.daemon.stop(); f.fixture.server.stop(true) }
}, 25000)

test('Auto never delegates commands or instruction-file changes to the AI reviewer', async () => {
  const f = await setup()
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: command('shell', { command: 'echo risky' }) })
    const question = await pending(f)
    expect(f.fixture.reviews).toHaveLength(0)
    await f.daemon.client.answerPermission({ id: question.id, decision: 'deny', remember: false }); await done(f)
    let completed = 1
    for (const file of ['AGENTS.md', 'id_ed25519']) {
      await f.daemon.client.prompt({ id: f.id, text: write(file) })
      const edit = await pending(f)
      expect(f.fixture.reviews).toHaveLength(0)
      expect(existsSync(join(f.cwd, file))).toBe(false)
      await f.daemon.client.answerPermission({ id: edit.id, decision: 'deny', remember: false }); await done(f, ++completed)
    }
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('a mode change cancels an in-flight AI review and asks instead of accepting its late approval', async () => {
  const f = await setup(); f.fixture.setReview('hold')
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('late.txt') })
    await until(() => f.fixture.reviews.length === 1)
    await change(f, 'ask'); await pending(f)
    f.fixture.releaseReview()
    expect(existsSync(join(f.cwd, 'late.txt'))).toBe(false)
    expect((await f.daemon.client.session({ id: f.id })).accessReviews?.[0]?.status).toBe('ask')
    expect(f.fixture.reviews).toHaveLength(1)
  } finally { f.fixture.releaseReview(); await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('interrupting an Auto review cancels the tool without creating a later permission question', async () => {
  const f = await setup(); f.fixture.setReview('hold')
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('cancelled.txt') })
    await until(() => f.fixture.reviews.length === 1)
    await f.daemon.client.interrupt({ id: f.id })
    await until(async () => (await f.daemon.client.session({ id: f.id })).accessReviews?.[0]?.status === 'ask')
    const d = await f.daemon.client.session({ id: f.id })
    expect(d.toolCalls[0]?.status).toBe('cancelled')
    expect(d.permissions.filter((p) => p.state === 'pending')).toHaveLength(0)
    expect(existsSync(join(f.cwd, 'cancelled.txt'))).toBe(false)
    expect(f.fixture.reviews).toHaveLength(1)
  } finally { f.fixture.releaseReview(); await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('a public-looking junction into repository internals cannot obtain automatic edit permission', async () => {
  const f = await setup()
  try {
    symlinkSync(join(f.cwd, '.git'), join(f.cwd, 'public'), process.platform === 'win32' ? 'junction' : 'dir')
    const before = readFileSync(join(f.cwd, '.git', 'config'), 'utf8')
    await change(f, 'edits')
    await f.daemon.client.prompt({ id: f.id, text: write('public/config') }); await pending(f)
    expect(readFileSync(join(f.cwd, '.git', 'config'), 'utf8')).toBe(before)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('Full access respects a remembered operator denial for the exact request', async () => {
  const f = await setup()
  try {
    const text = write('remembered.txt')
    await f.daemon.client.prompt({ id: f.id, text }); const question = await pending(f)
    await f.daemon.client.answerPermission({ id: question.id, decision: 'deny', remember: true }); await done(f)
    await change(f, 'full')
    await f.daemon.client.prompt({ id: f.id, text }); await done(f, 2)
    const d = await f.daemon.client.session({ id: f.id })
    expect(d.toolCalls.at(-1)).toMatchObject({ status: 'denied', decisionSource: 'saved' })
    expect(existsSync(join(f.cwd, 'remembered.txt'))).toBe(false)
  } finally { await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)

test('the shared execution deadline ends a hung AI review, releases capacity and requests a human answer', async () => {
  const f = await setup({ timeoutMs: 2000 }); f.fixture.setReview('hold')
  try {
    await change(f, 'auto')
    await f.daemon.client.prompt({ id: f.id, text: write('timeout.txt') })
    await pending(f)
    const d = await f.daemon.client.session({ id: f.id })
    expect(d.accessReviews?.[0]?.status).toBe('ask')
    expect(d.executions?.find((e) => e.id.startsWith('review:'))?.state).toBe('cancelled')
    expect((await f.daemon.client.health()).execution?.active).toBe(0)
    expect(existsSync(join(f.cwd, 'timeout.txt'))).toBe(false)
    expect(f.fixture.reviews).toHaveLength(1)
  } finally { f.fixture.releaseReview(); await f.daemon.stop(); f.fixture.server.stop(true) }
}, 20000)
