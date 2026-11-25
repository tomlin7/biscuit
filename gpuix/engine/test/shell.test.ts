import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseShellLink } from '../../src/shell/links'
import { readWindowState, saveWindowState, clampBounds } from '../../src/shell/state'
import { supervise } from '../../src/shell/watchdog'
import { CHUNK_SIZE, makeManifest, stageRelease } from '../../src/shell/updates'
import { allowEngineSpawn, allowSourceRuntime } from '../../src/shell/runtime'

const temp = () => mkdtempSync(path.join(os.tmpdir(), 'hiroshi-shell-'))
test('recursive launch depth is rejected before spawning any process', () => {
  expect(() => allowEngineSpawn(undefined)).not.toThrow()
  expect(() => allowEngineSpawn('1')).toThrow('recursive')
  expect(() => allowEngineSpawn('invalid')).toThrow('recursive')
  expect(() => allowSourceRuntime('bun.exe')).not.toThrow()
  expect(() => allowSourceRuntime('hiroshi.exe')).toThrow('compiled runtime')
})
test('deep links carry a session, file and line; malformed and escaping links fail', () => {
  expect(parseShellLink('hiroshi://session/ses_one?file=src/main.ts&line=42')).toEqual({ sessionID: 'ses_one', file: 'src/main.ts', line: 42 })
  for (const link of ['https://session/ses_one', 'hiroshi://session/invalid', 'hiroshi://session/ses_one?file=../key', 'hiroshi://session/ses_one?file=C:/key', 'hiroshi://session/ses_one?file=src%5cmain.ts', 'hiroshi://session/ses_one?line=2', 'hiroshi://session/ses_one?file=x&line=0']) expect(() => parseShellLink(link)).toThrow()
})
test('window preferences retain layout and display placement per workspace and recover from corruption', () => {
  const home = temp()
  try {
    saveWindowState('one', { x: -1200, y: 80, width: 900, height: 700, display: 'left', surface: 'files', panelOpen: true, sessionID: 'ses_saved' }, home)
    saveWindowState('one', { sidebarWidth: 310 }, home)
    saveWindowState('two', { surface: 'terminal' }, home)
    expect(readWindowState('one', home)).toMatchObject({ x: -1200, display: 'left', sidebarWidth: 310, surface: 'files', sessionID: 'ses_saved' })
    expect(readWindowState('two', home).surface).toBe('terminal')
    expect(clampBounds({ x: -5000, y: 3000, width: 5000, height: 3000 }, { x: 0, y: 0, width: 1920, height: 1040 })).toEqual({ x: 0, y: 0, width: 1920, height: 1040 })
    writeFileSync(path.join(home, 'shell.json'), '{broken')
    expect(readWindowState('one', home).width).toBe(1180)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
for (const mode of ['hang', 'crash', 'fail']) test(`window watchdog handles ${mode} without touching the engine`, async () => {
  const home = temp(), counter = path.join(home, 'count')
  let restarts = 0
  const run = () => supervise([process.execPath, path.join(import.meta.dir, 'fixtures/window-watchdog.ts'), counter, mode], { timeoutMs: 600, startupMs: 5000, maxRestarts: 2, onRestart: () => restarts++ })
  try {
    if (mode === 'fail') { await expect(run()).rejects.toThrow('recovery stopped'); expect(restarts).toBe(2); expect(readFileSync(counter, 'utf8')).toBe('3') }
    else { expect(await run()).toBe(0); expect(restarts).toBe(1); expect(readFileSync(counter, 'utf8')).toBe('2') }
  } finally { rmSync(home, { recursive: true, force: true }) }
}, 15000)

test('verified delta update reuses unchanged chunks, downloads changes, and never replaces running files', async () => {
  const home = temp(), installed = path.join(home, 'installed'), next = path.join(home, 'next'), blobs = path.join(home, 'blobs')
  const suffix = process.platform === 'win32' ? '.exe' : ''
  const names = [`hiroshi${suffix}`, `hiroshi-engine${suffix}`]
  mkdirSync(installed); mkdirSync(next)
  const common = Buffer.alloc(CHUNK_SIZE, 97)
  writeFileSync(path.join(installed, names[0]), Buffer.concat([common, Buffer.from('old')]))
  writeFileSync(path.join(next, names[0]), Buffer.concat([common, Buffer.from('new')]))
  for (const dir of [installed, next]) writeFileSync(path.join(dir, names[1]), 'unchanged engine')
  const previous = makeManifest(installed, names, '0.11.0', path.join(home, 'old-blobs'))
  const manifest = makeManifest(next, names, '0.12.0', blobs, previous)
  let verified = false, requests = 0
  const fakeFetch = (async (url: string | URL | Request) => {
    const name = String(url).split('/').at(-1)!
    if (name.startsWith('manifest-')) return Response.json(manifest)
    expect(verified).toBe(true); requests++
    return new Response(readFileSync(path.join(blobs, name)))
  }) as typeof fetch
  try {
    const result = await stageRelease('0.12.0', { home, installed, fetch: fakeFetch, verify: async () => { verified = true } })
    expect(result.downloaded).toBe(1); expect(result.reused).toBe(2); expect(requests).toBe(1)
    expect(readFileSync(path.join(result.directory, names[0]))).toEqual(readFileSync(path.join(next, names[0])))
    expect(readFileSync(path.join(installed, names[0])).subarray(-3).toString()).toBe('old')
    await expect(stageRelease('0.13.0', { home, installed, fetch: fakeFetch, verify: async () => { throw new Error('bad signature') } })).rejects.toThrow('bad signature')
    expect(existsSync(path.join(home, 'updates', '0.13.0'))).toBe(false)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
