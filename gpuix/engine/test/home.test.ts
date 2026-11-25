import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { engineHome } from '../src/home'
import { ENGINE_VERSION } from '../src/protocol'
import { resolveShell } from '../src/shell'

describe('the home directory', () => {
  test('HIROSHI_HOME wins everywhere', () => {
    const home = engineHome({ env: { HIROSHI_HOME: '/somewhere/else' }, platform: 'win32', home: 'C:\\Users\\x' })
    expect(home).toBe('/somewhere/else')
  })

  test('windows uses LOCALAPPDATA', () => {
    expect(
      engineHome({ env: { LOCALAPPDATA: 'C:\\Users\\x\\AppData\\Local' }, platform: 'win32', home: 'C:\\Users\\x' }),
    ).toBe('C:\\Users\\x\\AppData\\Local\\Hiroshi')
  })

  test('windows falls back to the profile', () => {
    expect(engineHome({ env: {}, platform: 'win32', home: 'C:\\Users\\x' })).toBe(
      'C:\\Users\\x\\AppData\\Local\\Hiroshi',
    )
  })

  test('macos uses Application Support', () => {
    expect(engineHome({ env: {}, platform: 'darwin', home: '/Users/x' })).toBe(
      '/Users/x/Library/Application Support/Hiroshi',
    )
  })

  test('linux uses the XDG state directory', () => {
    expect(engineHome({ env: {}, platform: 'linux', home: '/home/x' })).toBe('/home/x/.local/state/hiroshi')
    expect(engineHome({ env: { XDG_STATE_HOME: '/state' }, platform: 'linux', home: '/home/x' })).toBe(
      '/state/hiroshi',
    )
  })
})

describe('the version handshake', () => {
  test('the engine and the package ship as the same version', () => {
    const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dir, '../../package.json'), 'utf8')) as {
      version: string
    }
    expect(ENGINE_VERSION).toBe(pkg.version)
  })
})

describe('the shell', () => {
  test('a posix shell is taken from $SHELL and given -c', () => {
    const shell = resolveShell('linux', { SHELL: '/bin/zsh' } as NodeJS.ProcessEnv)
    expect(shell.argv).toEqual(['/bin/zsh', '-c'])
    expect(shell.label).toBe('zsh')
  })

  test('a missing $SHELL falls back to /bin/sh', () => {
    const shell = resolveShell('linux', {} as NodeJS.ProcessEnv)
    expect(shell.argv).toEqual(['/bin/sh', '-c'])
  })

  test('windows always ends with the command-taking flag', () => {
    const shell = resolveShell('win32', {} as NodeJS.ProcessEnv)
    const last = shell.argv.at(-1)!
    expect(['-Command', '/c']).toContain(last)
    expect(shell.label.length).toBeGreaterThan(0)
  })

  test('HIROSHI_SHELL overrides the platform default', () => {
    const shell = resolveShell('win32', { HIROSHI_SHELL: '/custom/sh' } as NodeJS.ProcessEnv)
    expect(shell.argv).toEqual(['/custom/sh', '-c'])
  })
})
