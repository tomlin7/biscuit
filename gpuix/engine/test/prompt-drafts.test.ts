import { expect, test } from 'bun:test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PromptDraftController } from '../../src/engine/prompt-draft'
import { createPromptStore } from '../../src/shell/prompt-store'
import { engineClient } from '../../src/engine/client'
import { daemonFetch } from '../src/local-transport'
import { startDaemon, tempHome, until } from './harness'

async function setup() {
  const root = tempHome(), home = join(root, 'profile'), cwd = join(root, 'repository'), marker = join(root, 'invocations')
  mkdirSync(home); mkdirSync(cwd)
  if (Bun.spawnSync(['git', '-C', cwd, 'init', '-b', 'main']).exitCode) throw new Error('Could not initialize fixture repository')
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'cli/chat', providers: [{ id: 'cli', adapter: 'cursor-cli',
    command: [process.execPath, join(import.meta.dir, 'fixtures/cli-response.ts')],
    models: [{ id: 'chat', model: 'default', label: 'Fixture CLI', contextWindow: 32768, reservedOutput: 1024 }] }] }))
  const env = { HIROSHI_CLI_FIXTURE: 'cursor', HIROSHI_CLI_MARKER: marker }
  let daemon = await startDaemon({ home, workspace: cwd, env })
  const { session } = await daemon.client.createSession({ cwd })
  const controllers: PromptDraftController[] = []
  const composer = (id = session.id, workspace = cwd) => {
    const controller = new PromptDraftController(createPromptStore({ cwd: workspace, id }, home))
    controllers.push(controller); return controller
  }
  return { home, cwd, marker, session, composer, get daemon() { return daemon },
    restart: async () => { await daemon.crash(); daemon = await startDaemon({ home, workspace: cwd, env }) },
    stop: async () => { for (const item of controllers) item.dispose(); await daemon.stop() },
    finished: () => until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded'),
  }
}

test('connection loss before admission keeps the durable draft and key; only deliberate retry executes', async () => {
  const fixture = await setup()
  try {
    const draft = fixture.composer(); draft.edit('retain before admission 漢🙂')
    let key: string | undefined
    const disconnected = engineClient(fixture.daemon.record, (async () => {
      const persisted = createPromptStore({ id: fixture.session.id, cwd: fixture.cwd }, fixture.home)
      try { key = persisted.read().pending?.key; expect(key).toBeDefined() } finally { persisted.close() }
      throw new Error('offline fixture')
    }) as unknown as typeof fetch)
    expect(await draft.submit(disconnected, 'steer', 'cli/chat')).toBe(false)
    expect((await fixture.daemon.client.session({ id: fixture.session.id })).messages).toHaveLength(0)
    expect(draft.getSnapshot()).toMatchObject({ text: 'retain before admission 漢🙂', pending: { key, status: 'uncertain', mode: 'steer', model: 'cli/chat' } })
    draft.dispose()
    const restored = fixture.composer()
    await Bun.sleep(100)
    expect((await fixture.daemon.client.session({ id: fixture.session.id })).messages).toHaveLength(0)
    expect(await restored.retry(fixture.daemon.client)).toBe(true)
    await fixture.finished()
    expect(restored.getSnapshot()).toMatchObject({ text: '', pending: null })
    const detail = await fixture.daemon.client.session({ id: fixture.session.id })
    expect(detail.messages.filter((item) => item.role === 'user')).toHaveLength(1)
    expect(detail.messages[0]).toMatchObject({ text: 'retain before admission 漢🙂', mode: 'steer', model: 'cli/chat' })
  } finally { await fixture.stop() }
}, 20000)

test('lost acknowledgement and daemon restart retry the original operation without a second CLI invocation', async () => {
  const fixture = await setup()
  try {
    const draft = fixture.composer(); draft.edit('one admitted operation')
    const lostAck = engineClient(fixture.daemon.record, (async (url, init) => {
      const response = await daemonFetch(url, init)
      if (response.ok) { await response.arrayBuffer(); throw new Error('lost acknowledgement fixture') }
      return response
    }) as typeof fetch)
    expect(await draft.submit(lostAck, 'queue', 'cli/chat')).toBe(false)
    const key = draft.getSnapshot().pending!.key
    await fixture.finished()
    draft.dispose(); await fixture.restart()
    const restored = fixture.composer()
    expect(restored.getSnapshot().pending?.key).toBe(key)
    expect(await restored.retry(fixture.daemon.client)).toBe(true)
    const detail = await fixture.daemon.client.session({ id: fixture.session.id })
    expect(detail.steps).toHaveLength(1)
    expect(detail.messages.filter((item) => item.role === 'user')).toHaveLength(1)
    expect(readFileSync(fixture.marker, 'utf8').trim().split('\n')).toHaveLength(1)
    expect(restored.getSnapshot().pending).toBeNull()
  } finally { await fixture.stop() }
}, 25000)

test('a rejected send retains text and immutable retry payload; explicit forget permits a corrected send', async () => {
  const fixture = await setup()
  try {
    const draft = fixture.composer(); draft.edit('rejected input')
    expect(await draft.submit(fixture.daemon.client, 'queue', 'missing/model')).toBe(false)
    const key = draft.getSnapshot().pending!.key
    expect(draft.getSnapshot()).toMatchObject({ text: 'rejected input', pending: { status: 'rejected' } })
    draft.edit('newer corrected input')
    expect(await draft.retry(fixture.daemon.client)).toBe(false)
    expect(draft.getSnapshot().pending).toMatchObject({ key, text: 'rejected input', model: 'missing/model' })
    expect(draft.getSnapshot().text).toBe('newer corrected input')
    expect((await fixture.daemon.client.session({ id: fixture.session.id })).messages).toHaveLength(0)
    draft.forget()
    expect(draft.getSnapshot()).toMatchObject({ text: 'newer corrected input', pending: null })
    expect(await draft.submit(fixture.daemon.client, 'queue', 'cli/chat')).toBe(true)
    await fixture.finished()
  } finally { await fixture.stop() }
}, 20000)

test('delayed acknowledgement, rapid task switching and a duplicate click preserve newer edits in both tasks', async () => {
  const fixture = await setup()
  let release!: () => void
  const gate = new Promise<void>((resolve) => release = resolve)
  try {
    const draft = fixture.composer(); draft.edit('first submission')
    let admitted = false
    const delayed = engineClient(fixture.daemon.record, (async (url, init) => {
      const response = await daemonFetch(url, init); admitted = true; await gate; return response
    }) as typeof fetch)
    const send = draft.submit(delayed, 'queue', 'cli/chat')
    expect(await draft.submit(delayed, 'queue', 'cli/chat')).toBe(false)
    await until(() => admitted)
    draft.edit('newer unsent edit'); draft.dispose()
    const { session: second } = await fixture.daemon.client.createSession({ cwd: fixture.cwd })
    const other = fixture.composer(second.id); other.edit('second task draft')
    release(); expect(await send).toBe(true)
    expect(other.getSnapshot().text).toBe('second task draft')
    expect(fixture.composer().getSnapshot()).toMatchObject({ text: 'newer unsent edit', pending: null })
    await fixture.finished()
    expect(readFileSync(fixture.marker, 'utf8').trim().split('\n')).toHaveLength(1)
    expect((await fixture.daemon.client.session({ id: second.id })).messages).toHaveLength(0)
  } finally { release(); await fixture.stop() }
}, 20000)

test('two windows cannot overwrite a newer saved edit; acknowledgement preserves an edit from another window', async () => {
  const fixture = await setup()
  try {
    const first = fixture.composer(), second = fixture.composer()
    first.edit('first window edit'); second.edit('stale second window edit')
    expect(second.getSnapshot().unsaved).toBe(true)
    expect(second.getSnapshot().text).toBe('stale second window edit')
    expect(await second.submit(fixture.daemon.client, 'queue')).toBe(false)
    second.reload(); expect(second.getSnapshot().text).toBe('first window edit')
    expect(await first.submit(null, 'queue', 'cli/chat')).toBe(false)
    second.reload(); second.edit('a newer draft from window two')
    expect(await first.retry(fixture.daemon.client)).toBe(true)
    expect(first.getSnapshot()).toMatchObject({ text: 'a newer draft from window two', pending: null })
    second.reload(); expect(second.getSnapshot().text).toBe('a newer draft from window two')
    second.discard(); expect(second.getSnapshot().text).toBe('')
    await fixture.finished()
  } finally { await fixture.stop() }
}, 20000)

test('a conflicting edit during acknowledgement stays unsaved until explicit reload and cannot overwrite another window', async () => {
  const fixture = await setup()
  let release!: () => void
  const gate = new Promise<void>((resolve) => release = resolve)
  try {
    const first = fixture.composer(); first.edit('original turn')
    let admitted = false
    const delayed = engineClient(fixture.daemon.record, (async (url, init) => {
      const response = await daemonFetch(url, init); admitted = true; await gate; return response
    }) as typeof fetch)
    const send = first.submit(delayed, 'queue', 'cli/chat')
    await until(() => admitted)
    const second = fixture.composer(); second.edit('newer saved text')
    first.edit('unsaved conflicting text')
    expect(first.getSnapshot().unsaved).toBe(true)
    release(); expect(await send).toBe(true)
    first.edit('another conflicting edit')
    expect(first.getSnapshot().unsaved).toBe(true)
    expect(fixture.composer().getSnapshot().text).toBe('newer saved text')
    first.reload(); expect(first.getSnapshot()).toMatchObject({ text: 'newer saved text', unsaved: false, pending: null })
    await fixture.finished()
  } finally { release(); await fixture.stop() }
}, 20000)

test('a local storage failure blocks admission and preserves the unsaved input in the window', async () => {
  const fixture = await setup()
  const blocked = join(fixture.cwd, 'not-a-directory'); writeFileSync(blocked, 'preserve fixture file')
  const draft = new PromptDraftController(createPromptStore({ cwd: fixture.cwd, id: fixture.session.id }, blocked))
  try {
    draft.edit('keep this input visible')
    expect(draft.getSnapshot()).toMatchObject({ text: 'keep this input visible', unsaved: true })
    expect(await draft.submit(fixture.daemon.client, 'queue', 'cli/chat')).toBe(false)
    expect((await fixture.daemon.client.session({ id: fixture.session.id })).messages).toHaveLength(0)
    expect(readFileSync(blocked, 'utf8')).toBe('preserve fixture file')
  } finally { draft.dispose(); await fixture.stop() }
}, 15000)

test('a separate process exits without closing the store; its staged prompt survives and remains workspace scoped', () => {
  const home = tempHome(), cwd = join(home, 'repository'), id = 'ses_saved'
  const child = Bun.spawnSync([process.execPath, join(import.meta.dir, 'fixtures/prompt-draft.ts'), home, cwd, id])
  expect(child.exitCode).toBe(0)
  const store = createPromptStore({ cwd, id }, home), other = createPromptStore({ cwd: cwd + '-other', id }, home)
  try {
    expect(store.read()).toMatchObject({ text: 'saved before exit 漢🙂', pending: { text: 'saved before exit 漢🙂', status: 'saved' } })
    expect(other.read()).toMatchObject({ text: '', pending: null })
  } finally { store.close(); other.close() }
})
