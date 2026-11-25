import { expect, test } from 'bun:test'
import { mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { WorkspaceFiles, reviewWorkspace } from '../src/workspace'
import { browsePage } from '../src/browser'
import { startDaemon, tempHome, until } from './harness'
import { toolFixture } from './tool-fixture'

function git(cwd: string, args: string[]) {
  const result = Bun.spawnSync({ cmd: ['git', '-C', cwd, ...args], stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}
function repository() {
  const home = tempHome(), cwd = join(home, 'workspace'); mkdirSync(cwd)
  git(cwd, ['init', '-b', 'main']); git(cwd, ['config', 'user.name', 'Test']); git(cwd, ['config', 'user.email', 'test@local']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, 'tracked.txt'), 'original\n'); writeFileSync(join(cwd, '.gitignore'), 'ignored.txt\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-m', 'initial'])
  return { home, cwd }
}

test('real files share workspace boundaries, bound previews and classify binary content', async () => {
  const home = tempHome(), cwd = join(home, 'workspace'); mkdirSync(cwd)
  mkdirSync(join(cwd, 'nested')); writeFileSync(join(cwd, 'nested', 'file.txt'), 'from the workspace')
  writeFileSync(join(home, 'outside.txt'), 'outside')
  writeFileSync(join(cwd, 'huge.txt'), 'x'.repeat(300000))
  writeFileSync(join(cwd, 'binary'), Buffer.from([0, 255, 1]))
  const files = new WorkspaceFiles(cwd, home)
  try {
    expect((await files.list()).entries[0]!.name).toBe('nested')
    expect((await files.file('nested/file.txt')).text).toBe('from the workspace')
    expect((await files.file('huge.txt')).truncated).toBe(true)
    expect((await files.file('huge.txt')).text.length).toBeLessThanOrEqual(256 * 1024)
    expect((await files.file('binary')).binary).toBe(true)
    await expect(files.file('../outside.txt')).rejects.toMatchObject({ code: 'workspace_path' })
    symlinkSync(home, join(cwd, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
    await expect(files.file('escape/outside.txt')).rejects.toMatchObject({ code: 'workspace_path' })
    mkdirSync(join(cwd, '.git')); writeFileSync(join(cwd, '.git', 'config'), 'private Git metadata')
    expect((await files.list()).entries.some((entry) => entry.name === '.git')).toBe(false)
    await expect(files.file('.git/config')).rejects.toMatchObject({ code: 'workspace_path' })
  } finally { rmSync(home, { recursive: true, force: true }) }
})

test('Git review includes branch commits, pending/staged changes, untracked content and immutable index', async () => {
  const { home, cwd } = repository()
  try {
    git(cwd, ['switch', '-c', 'feature'])
    writeFileSync(join(cwd, 'branch.txt'), 'committed on branch\n'); git(cwd, ['add', '.']); git(cwd, ['commit', '-m', 'branch change'])
    writeFileSync(join(cwd, 'tracked.txt'), 'staged only\n'); git(cwd, ['add', 'tracked.txt'])
    writeFileSync(join(cwd, 'tracked.txt'), 'working version\n')
    writeFileSync(join(cwd, 'space 漢.txt'), 'untracked value\n')
    writeFileSync(join(cwd, 'ignored.txt'), 'ignore me')
    const index = git(cwd, ['ls-files', '--stage'])
    const review = await reviewWorkspace(cwd)
    expect(review.base).toBe('refs/heads/main')
    expect(review.files.map((file) => file.path).sort()).toEqual(['branch.txt', 'space 漢.txt', 'tracked.txt'])
    expect(review.patch).toContain('committed on branch')
    expect(review.patch).toContain('working version')
    expect(review.patch).toContain('untracked value')
    expect(review.patch).toContain('@@ -0,0 +1,1 @@')
    expect(review.patch).toContain('+++ \"b/space 漢.txt\"')
    expect(review.stagedPatch).toContain('staged only')
    expect(review.stagedPatch).not.toContain('working version')
    expect(review.workingPatch).toContain('working version')
    expect(review.workingPatch).not.toContain('committed on branch')
    expect(git(cwd, ['ls-files', '--stage'])).toBe(index)
    writeFileSync(join(cwd, 'binary.bin'), Buffer.from([0, 1]))
    const first = await reviewWorkspace(cwd)
    writeFileSync(join(cwd, 'binary.bin'), Buffer.from([0, 2]))
    expect((await reviewWorkspace(cwd)).revision).not.toBe(first.revision)
    await expect(reviewWorkspace(cwd, '--bad-ref')).rejects.toMatchObject({ code: 'workspace_base' })
  } finally { try { rmSync(home, { recursive: true, force: true }) } catch {} }
}, 30000)

test('an unborn repository has a real untracked review', async () => {
  const home = tempHome()
  try {
    git(home, ['init']); writeFileSync(join(home, 'first.txt'), 'first file')
    const review = await reviewWorkspace(home)
    expect(review.available).toBe(true)
    expect(review.base).toBe('Empty repository')
    expect(review.patch).toContain('first file')
  } finally { try { rmSync(home, { recursive: true, force: true }) } catch {} }
}, 15000)

test('page reader follows safe redirects, decodes text and links, hides scripts and bounds responses', async () => {
  let auth = '', cookie = ''
  const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(req) {
    auth = req.headers.get('authorization') ?? ''; cookie = req.headers.get('cookie') ?? ''
    const path = new URL(req.url).pathname
    if (path === '/redirect') return new Response(null, { status: 302, headers: { location: '/page' } })
    if (path === '/unsafe') return new Response(null, { status: 302, headers: { location: 'file:///secret' } })
    if (path === '/huge') return new Response('x'.repeat(600000), { headers: { 'content-type': 'text/plain' } })
    if (path === '/error') return new Response('error', { status: 503 })
    return new Response('<title>Local &amp; real</title><h1>Reader marker</h1><p>Hello 漢</p><script>mustNotDisplay()</script><a href="/next">Next page</a><a href="javascript:bad()">Unsafe</a>', { headers: { 'content-type': 'text/html', 'set-cookie': 'private=value' } })
  } })
  try {
    const page = await browsePage(new URL('/redirect', server.url).href)
    expect(page.title).toBe('Local & real')
    expect(page.text).toContain('Reader marker')
    expect(page.text).not.toContain('mustNotDisplay')
    expect(page.scripted).toBe(true)
    expect(page.links).toEqual([{ label: 'Next page', url: new URL('/next', server.url).href }])
    expect(auth).toBe(''); expect(cookie).toBe('')
    expect((await browsePage(new URL('/huge', server.url).href)).truncated).toBe(true)
    await expect(browsePage('file:///secret')).rejects.toMatchObject({ code: 'browser_url' })
    await expect(browsePage(new URL('/unsafe', server.url).href)).rejects.toMatchObject({ code: 'browser_url' })
    await expect(browsePage(new URL('/error', server.url).href)).rejects.toMatchObject({ code: 'browser_http' })
  } finally { server.stop(true) }
})

test('real daemon shares tool changes with files/review, rejects stale commits, commits/pushes via durable runs and reports failures', async () => {
  const { home, cwd } = repository()
  const remote = join(home, 'remote.git'); git(home, ['init', '--bare', remote]); git(cwd, ['remote', 'add', 'origin', remote]); git(cwd, ['push', '-u', 'origin', 'main'])
  const fixture = toolFixture()
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/tools', providers: [fixture.provider] }))
  const daemon = await startDaemon({ home, workspace: cwd, env: { HIROSHI_TOOL_FIXTURE_KEY: 'local-only' } })
  try {
    const { session } = await daemon.client.createSession({})
    const detail = () => daemon.client.session({ id: session.id })
    writeFileSync(join(cwd, 'tracked.txt'), 'staged selection')
    git(cwd, ['add', 'tracked.txt'])
    writeFileSync(join(cwd, 'tracked.txt'), 'keep unstaged')
    writeFileSync(join(cwd, 'left.txt'), 'keep untracked')
    const selected = await daemon.client.workspaceReview({ id: session.id })
    const { run: stagedRun } = await daemon.client.workspaceCommit({ id: session.id, revision: selected.revision, message: 'staged only', includeUnstaged: false, push: false })
    await until(async () => (await daemon.client.run({ id: stagedRun.id })).run.status !== 'running')
    expect((await daemon.client.run({ id: stagedRun.id })).run.status).toBe('succeeded')
    expect(git(cwd, ['show', 'HEAD:tracked.txt'])).toBe('staged selection')
    expect(readFileSync(join(cwd, 'tracked.txt'), 'utf8')).toBe('keep unstaged')
    expect(git(cwd, ['ls-files', 'left.txt'])).toBe('')
    await daemon.client.prompt({ id: session.id, text: 'approve' })
    await until(async () => (await detail()).permissions.some((permission) => permission.state === 'pending'))
    await daemon.client.answerPermission({ id: (await detail()).permissions[0]!.id, decision: 'allow' })
    await until(async () => (await detail()).steps.at(-1)?.output === 'Tool turn complete: approve')
    expect((await daemon.client.workspaceList({ id: session.id })).entries.some((entry) => entry.name === 'approved.txt')).toBe(true)
    expect((await daemon.client.workspaceFile({ id: session.id, path: 'approved.txt' })).text).toBe('approved from the model')
    const old = await daemon.client.workspaceReview({ id: session.id })
    expect(old.files.find((file) => file.path === 'approved.txt')?.unstaged).toBe(true)
    expect(old.patch).toContain('approved from the model')
    writeFileSync(join(cwd, 'extra.txt'), 'new after review')
    const input = { id: session.id, revision: old.revision, message: `literal ' quote; $() & message`, includeUnstaged: true, push: true }
    await expect(daemon.client.workspaceCommit(input)).rejects.toMatchObject({ code: 'workspace_changed' })
    const review = await daemon.client.workspaceReview({ id: session.id })
    const { run } = await daemon.client.workspaceCommit({ ...input, revision: review.revision })
    await until(async () => (await daemon.client.run({ id: run.id })).run.status !== 'running')
    expect((await daemon.client.run({ id: run.id })).run.status).toBe('succeeded')
    expect(git(cwd, ['log', '-1', '--format=%B'])).toBe(input.message)
    expect(git(cwd, ['rev-parse', 'HEAD'])).toBe(git(remote, ['rev-parse', 'refs/heads/main']))
    expect((await detail()).chunks.some((chunk) => chunk.runID === run.id)).toBe(true)
    const clean = await daemon.client.workspaceReview({ id: session.id })
    git(cwd, ['remote', 'set-url', 'origin', join(home, 'missing-remote')])
    const { run: failed } = await daemon.client.workspaceCommit({ ...input, revision: clean.revision, pushOnly: true })
    await until(async () => (await daemon.client.run({ id: failed.id })).run.status !== 'running')
    expect((await daemon.client.run({ id: failed.id })).run.status).toBe('failed')
  } finally { fixture.server.stop(true); await daemon.stop() }
}, 60000)
