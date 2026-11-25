/**
 * Where the engine keeps its state.
 *
 * Pure on purpose: the cockpit resolves the same directory to find the
 * discovery file before it has ever spoken to a daemon, and it has to agree
 * with the daemon exactly. No `node:path`, no `node:os`, no runtime imports,
 * so the browser build can share it too.
 */

export interface HomeInput {
  env: Record<string, string | undefined>
  platform: string
  home: string
}

function join(platform: string, ...parts: string[]): string {
  const separator = platform === 'win32' ? '\\' : '/'
  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (index === 0) return part.replace(/[\\/]+$/, '')
      return part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
    })
    .join(separator)
}

/**
 * `HIROSHI_HOME` wins everywhere, which is what the tests and a second
 * profile use. Otherwise the platform's per-user application data directory.
 */
export function engineHome(input: HomeInput): string {
  const { env, platform, home } = input
  if (env.HIROSHI_HOME) return env.HIROSHI_HOME
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA || join(platform, home, 'AppData', 'Local')
    return join(platform, local, 'Hiroshi')
  }
  if (platform === 'darwin') return join(platform, home, 'Library', 'Application Support', 'Hiroshi')
  const state = env.XDG_STATE_HOME || join(platform, home, '.local', 'state')
  return join(platform, state, 'hiroshi')
}

/** The directory the cockpit reads before it spawns a daemon. */
export function currentEngineHome(): string {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>
  const platform = typeof process !== 'undefined' ? process.platform : 'linux'
  let home = ''
  try {
    // Loaded lazily so a browser bundle never evaluates it.
    const os = require('node:os') as typeof import('node:os')
    home = os.homedir()
  } catch {
    home = env.USERPROFILE || env.HOME || '/'
  }
  return engineHome({ env, platform, home })
}
