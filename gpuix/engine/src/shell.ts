/**
 * Which shell runs a command.
 *
 * The engine does not speak shell syntax itself: it hands one string to the
 * platform's shell, the same way a terminal would. The label is recorded on
 * the run so the cockpit can say what actually ran it.
 */

export interface ResolvedShell {
  /** The argv prefix. The command string is appended as one argument. */
  argv: string[]
  label: string
}

function which(command: string): string | null {
  try {
    return Bun.which(command)
  } catch {
    return null
  }
}

export function resolveShell(platform: string = process.platform, env: NodeJS.ProcessEnv = process.env): ResolvedShell {
  if (env.HIROSHI_SHELL) {
    return { argv: [env.HIROSHI_SHELL, '-c'], label: env.HIROSHI_SHELL }
  }

  if (platform === 'win32') {
    const pwsh = which('pwsh')
    if (pwsh) return { argv: [pwsh, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command'], label: 'pwsh' }
    const powershell = which('powershell')
    if (powershell) {
      return { argv: [powershell, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command'], label: 'powershell' }
    }
    return { argv: ['cmd.exe', '/d', '/s', '/c'], label: 'cmd' }
  }

  const shell = env.SHELL || '/bin/sh'
  return { argv: [shell, '-c'], label: shell.split('/').pop() || shell }
}
