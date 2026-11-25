/** Packaged entry: a small supervisor around the native window process. */
import { supervise } from './src/shell/watchdog'
import { launchLink } from './src/shell/links'
import { packagedBuild, allowSourceRuntime } from './src/shell/runtime'

if (!packagedBuild) allowSourceRuntime((await import('node:path')).basename(process.execPath))

if (process.env.HIROSHI_ENGINE_LAUNCH_DEPTH) throw new Error('Blocked cockpit being launched as an engine')
if (process.env.HIROSHI_SUPERVISED === '1' && !process.argv.includes('--window')) throw new Error('Blocked nested window supervisor')

if (process.argv.includes('--window')) {
  launchLink() // Reject malformed links before opening a window.
  process.env.HIROSHI_WINDOW_CHILD = '1'
  ;(await import('./src/shell/geometry')).installNativeLinks()
  await import('./app')
} else if (process.argv.includes('--register-links')) {
  ;(await import('./src/shell/register')).registerLinks()
} else if (process.argv.includes('--version')) {
  console.log((await import('./engine/src/protocol')).ENGINE_VERSION)
} else if (process.argv.includes('--update')) {
  const requested = process.argv[process.argv.indexOf('--update') + 1]
  const result = await (await import('./src/shell/updates')).stageRelease(requested)
  console.log(`Staged Hiroshi at ${result.directory} (${result.downloaded} chunks downloaded, ${result.reused} reused). Close Hiroshi and launch that version to update. The running engine was left untouched.`)
} else {
  launchLink()
  const command = packagedBuild ? [process.execPath, '--window', ...process.argv.slice(2)] : [process.execPath, import.meta.path, '--window', ...process.argv.slice(2)]
  const abort = new AbortController()
  process.on('SIGINT', () => abort.abort())
  process.on('SIGTERM', () => abort.abort())
  process.exitCode = await supervise(command, { signal: abort.signal, onRestart: (reason) => console.error(`Hiroshi: recovering ${reason}`) })
}
