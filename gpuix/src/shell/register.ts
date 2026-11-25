import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { packagedBuild } from './runtime'

/** Invoked only by the explicit --register-links command; per-user registration. */
export function registerLinks(): void {
  if (!packagedBuild) throw new Error('Register links using the installed Hiroshi executable')
  const exe = process.execPath
  const run = (cmd: string[]) => { const result = Bun.spawnSync(cmd, { windowsHide: true }); if (result.exitCode) throw new Error(result.stderr.toString()) }
  if (process.platform === 'win32') {
    const key = 'HKCU\\Software\\Classes\\hiroshi'
    run(['reg', 'add', key, '/ve', '/d', 'URL:Hiroshi session', '/f'])
    run(['reg', 'add', key, '/v', 'URL Protocol', '/d', '', '/f'])
    run(['reg', 'add', `${key}\\shell\\open\\command`, '/ve', '/d', `"${exe}" "%1"`, '/f'])
  } else if (process.platform === 'darwin') {
    const bundle = path.resolve(path.dirname(exe), '../..')
    if (!bundle.endsWith('.app')) throw new Error('Put Hiroshi.app in Applications before registering links')
    run(['/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister', '-f', bundle])
  } else {
    const directory = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share'), 'applications')
    mkdirSync(directory, { recursive: true })
    const quoted = exe.replace(/%/g, '%%').replace(/["`$\\]/g, '\\$&')
    writeFileSync(path.join(directory, 'hiroshi.desktop'), `[Desktop Entry]\nType=Application\nName=Hiroshi\nExec="${quoted}" %u\nMimeType=x-scheme-handler/hiroshi;\nTerminal=false\n`)
    run(['xdg-mime', 'default', 'hiroshi.desktop', 'x-scheme-handler/hiroshi'])
  }
  console.log('Registered hiroshi:// links for this user')
}
