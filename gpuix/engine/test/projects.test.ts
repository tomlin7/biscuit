import { expect, test } from 'bun:test'
import { mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDaemon, tempHome, until } from './harness'
import { readProjectSelection, saveProjectSelection, readWindowState, saveWindowState } from '../../src/shell/state'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { silentLogger } from '../src/log'
import { directory } from '../src/projects'

function repo(home: string, name: string) {
  const cwd = join(home, name); mkdirSync(cwd)
  const git = (args: string[]) => { const out = Bun.spawnSync(['git', '-C', cwd, ...args]); if (out.exitCode) throw new Error(out.stderr.toString()) }
  git(['init', '-b', 'main']); git(['config', 'user.name', 'Test']); git(['config', 'user.email', 'test@local']); git(['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, 'AGENTS.md'), `Instructions only for ${name}`)
  writeFileSync(join(cwd, `${name}.txt`), name)
  git(['add', '.']); git(['commit', '-m', 'initial'])
  return realpathSync(cwd)
}
test('two real projects isolate CLI cwd, instructions, history, files and checkpoints through restart', async () => {
  const home = tempHome(), a = repo(home, 'alpha'), b = repo(home, 'beta'), marker = join(home, 'cli-log')
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'cli/chat', providers: [{ id: 'cli', adapter: 'cursor-cli',
    command: [process.execPath, join(import.meta.dir, 'fixtures/cli-response.ts')], models: [{ id: 'chat', model: 'default', label: 'Fixture', contextWindow: 32768, reservedOutput: 1024 }] }] }))
  let daemon = await startDaemon({ home, env: { HIROSHI_CLI_MARKER: marker } })
  try {
    const { session: sa } = await daemon.client.openProject({ cwd: a })
    await daemon.client.prompt({ id: sa.id, text: 'alpha task' })
    // Selecting another project does not mutate the admitted alpha request.
    const { session: sb } = await daemon.client.openProject({ cwd: b })
    await daemon.client.prompt({ id: sb.id, text: 'beta task' })
    await until(async () => (await daemon.client.session({ id: sa.id })).steps[0]?.status === 'succeeded' && (await daemon.client.session({ id: sb.id })).steps[0]?.status === 'succeeded')
    const calls = readFileSync(marker, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
    for (const [cwd, name, other] of [[a, 'alpha', 'beta'], [b, 'beta', 'alpha']]) {
      const call = calls.find((value) => realpathSync(value.cwd) === cwd)
      // This CLI owns workspace loading. Its stdin must not duplicate AGENTS;
      // the daemon records the bound file's identity without claiming native scope.
      expect(call.input).not.toContain(`Instructions only for ${name}`)
      expect(call.input).not.toContain(`Instructions only for ${other}`)
      expect(call.input).not.toContain(`${other} task`)
      const detail = await daemon.client.session({ id: name === 'alpha' ? sa.id : sb.id })
      const source = detail.contexts[0]!.sources.find((item) => item.source === 'workspace/AGENTS.md')!
      expect(source).toMatchObject({ scope: '.', delivery: 'native-unverified', hash: new Bun.CryptoHasher('sha256').update(`Instructions only for ${name}`).digest('hex') })
      expect(detail.contexts[0]!.configuration?.warnings[0]).toContain('not verified')
    }
    expect((await daemon.client.workspaceFile({ id: sa.id, path: 'alpha.txt' })).text).toBe('alpha')
    await expect(daemon.client.workspaceFile({ id: sb.id, path: 'alpha.txt' })).rejects.toMatchObject({ code: 'not_found' })
    expect(directory((await daemon.client.workspaceReview({ id: sb.id })).root!).identity).toBe(directory(b).identity)
    const alpha = await daemon.client.session({ id: sa.id })
    expect(alpha.checkpoints[0]!.cwd).toBe(a)
    expect((await daemon.client.openProject({ cwd: a })).session.id).toBe(sa.id)
    await expect(daemon.client.openProject({ cwd: join(home, 'missing') })).rejects.toMatchObject({ code: 'bad_working_directory' })
    await expect(daemon.client.openProject({ cwd: join(a, 'alpha.txt') })).rejects.toMatchObject({ code: 'bad_working_directory' })
    await daemon.crash(); daemon = await startDaemon({ home })
    expect((await daemon.client.openProject({ cwd: a })).session).toMatchObject({ id: sa.id, cwd: a, workspaceIdentity: sa.workspaceIdentity })
    expect((await daemon.client.session({ id: sb.id })).messages.some((message) => message.text === 'beta task')).toBe(true)
  } finally { await daemon.stop() }
}, 45000)

test('removed/replaced folders keep history and reject work; reopening is an explicit new identity', async () => {
  const home = tempHome(), cwd = repo(home, 'original'), daemon = await startDaemon({ home })
  try {
    const { session } = await daemon.client.openProject({ cwd })
    await daemon.client.prompt({ id: session.id, text: 'keep this history' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    renameSync(cwd, join(home, 'moved'))
    expect((await daemon.client.projects()).projects[0]!.status).toBe('missing')
    await expect(daemon.client.prompt({ id: session.id, text: 'must not run' })).rejects.toMatchObject({ code: 'workspace_missing' })
    expect((await daemon.client.session({ id: session.id })).messages[0]!.text).toBe('keep this history')
    mkdirSync(cwd); writeFileSync(join(cwd, 'different.txt'), 'replacement')
    expect((await daemon.client.projects()).projects.find((item) => item.sessionID === session.id)!.status).toBe('changed')
    await expect(daemon.client.workspaceList({ id: session.id })).rejects.toMatchObject({ code: 'workspace_changed' })
    const replacement = (await daemon.client.openProject({ cwd })).session
    expect(replacement.id).not.toBe(session.id)
    expect(replacement.workspaceIdentity).not.toBe(session.workspaceIdentity)
    expect((await daemon.client.workspaceReview({ id: replacement.id })).available).toBe(false)
    expect((await daemon.client.workspaceFile({ id: replacement.id, path: 'different.txt' })).text).toBe('replacement')
  } finally { await daemon.stop() }
}, 30000)

test('project selection and panel preferences survive restart without sharing another project settings', () => {
  const home = tempHome()
  saveWindowState('alpha', { panelOpen: true, surface: 'files', panelWidth: 600 }, home)
  saveWindowState('beta', { panelOpen: false, surface: 'review', panelWidth: 800 }, home)
  saveProjectSelection('launcher', 'beta', 'ses_beta', home)
  expect(readProjectSelection('launcher', home)).toEqual({ cwd: 'beta', sessionID: 'ses_beta' })
  expect(readWindowState('alpha', home)).toMatchObject({ panelOpen: true, surface: 'files', panelWidth: 600 })
  expect(readWindowState('beta', home)).toMatchObject({ panelOpen: false, surface: 'review', panelWidth: 800 })
})

test('a queued command cannot enter a replacement folder after another project releases capacity', async () => {
  const home = tempHome(), cwd = repo(home, 'queued-project')
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, minFreeMemoryMB: 128, timeoutMs: 60000 }))
  const daemon = await startDaemon({ home })
  try {
    const { session: owner } = await daemon.client.createSession({})
    const { session: target } = await daemon.client.openProject({ cwd })
    const { run: holding } = await daemon.client.startRun({ id: owner.id, command: process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30' })
    await until(async () => (await daemon.client.health()).execution?.active === 1)
    const { run: queued } = await daemon.client.startRun({ id: target.id, command: 'echo must-not-enter-replacement' })
    expect((await daemon.client.session({ id: target.id })).executions!.find((item) => item.id === queued.id)!.state).toBe('queued')
    renameSync(cwd, join(home, 'original-folder')); mkdirSync(cwd)
    await daemon.client.openProject({ cwd })
    await daemon.client.cancelRun({ id: holding.id })
    await until(async () => (await daemon.client.run({ id: queued.id })).run.status === 'failed')
    expect((await daemon.client.run({ id: queued.id })).run.error).toContain('different folder')
    expect((await daemon.client.session({ id: target.id })).chunks.map((chunk) => chunk.data).join('')).not.toContain('must-not-enter-replacement')
  } finally { await daemon.stop() }
}, 30000)

test('legacy sessions adopt a readable directory once; unavailable legacy paths cannot adopt a later replacement', () => {
  const home = tempHome(), cwd = repo(home, 'legacy'), store = Store.open(':memory:')
  store.migrate()
  store.createSession({ id: 'readable', cwd, title: 'Legacy', createdAt: 1, updatedAt: 1 })
  store.createSession({ id: 'missing', cwd: join(home, 'missing'), title: 'Unavailable legacy', createdAt: 1, updatedAt: 1 })
  try {
    const sessions = new Sessions(store, silentLogger(), { cwd })
    expect(store.session('readable')!.workspaceIdentity).toBeTruthy()
    mkdirSync(join(home, 'missing'))
    expect(() => sessions.prompt('missing', { text: 'do not redirect' })).toThrow('different folder')
    expect(store.messages('missing')).toHaveLength(0)
  } finally { store.close() }
})
