import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { currentEngineHome } from '../../engine/src/home'

export const CHUNK_SIZE = 1024 * 1024
const repo = 'hiroshi-os/Hiroshi'
const releaseURL = `https://github.com/${repo}/releases/download`
export interface ReleaseManifest {
  version: string; platform: string; arch: string
  files: { path: string; size: number; sha256: string; executable: boolean; chunks: { sha256: string; version: string }[] }[]
}
export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
function version(value: unknown): value is string { return typeof value === 'string' && /^0\.\d{1,3}\.\d+$/.test(value) }
export function validateManifest(value: unknown, expected: string, target: { platform: string; arch: string } = process): ReleaseManifest {
  const manifest = value as ReleaseManifest
  if (!manifest || !version(manifest.version) || manifest.version !== expected || manifest.platform !== target.platform || manifest.arch !== target.arch || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 100) throw new Error('Release does not match this version or platform')
  let total = 0
  const names = new Set<string>()
  for (const file of manifest.files) {
    if (!file || typeof file.path !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(file.path) || file.path === '.' || file.path === '..' || names.has(file.path.toLowerCase()) || !Number.isSafeInteger(file.size) || file.size < 0 || (total += file.size) > 2 ** 31 || !/^[a-f0-9]{64}$/.test(file.sha256) || typeof file.executable !== 'boolean' || !Array.isArray(file.chunks) || file.chunks.length !== Math.ceil(file.size / CHUNK_SIZE)) throw new Error('Invalid release file')
    names.add(file.path.toLowerCase())
    for (const chunk of file.chunks) if (!chunk || !/^[a-f0-9]{64}$/.test(chunk.sha256) || !version(chunk.version)) throw new Error('Invalid release chunk')
  }
  const suffix = target.platform === 'win32' ? '.exe' : ''
  if (!names.has(`hiroshi${suffix}`) || !names.has(`hiroshi-engine${suffix}`)) throw new Error('Release must include the cockpit and engine together')
  return manifest
}
export function makeManifest(directory: string, files: string[], current: string, blobs: string, previous?: ReleaseManifest): ReleaseManifest {
  const known = new Map(previous?.files.flatMap((file) => file.chunks.map((chunk) => [chunk.sha256, chunk.version] as const)))
  mkdirSync(blobs, { recursive: true })
  return { version: current, platform: process.platform, arch: process.arch, files: files.map((name) => {
    const bytes = readFileSync(path.join(directory, name)), chunks: ReleaseManifest['files'][number]['chunks'] = []
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const block = bytes.subarray(offset, offset + CHUNK_SIZE), sha256 = digest(block), source = known.get(sha256) ?? current
      chunks.push({ sha256, version: source })
      if (source === current) writeFileSync(path.join(blobs, `${sha256}.gz`), Bun.gzipSync(block))
    }
    return { path: name, size: bytes.length, sha256: digest(bytes), executable: /^hiroshi(?:-engine)?(?:\.exe)?$/.test(name), chunks }
  }) }
}
async function bounded(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error(`Release download failed (${response.status})`)
  const reader = response.body.getReader(), parts: Uint8Array[] = []
  let size = 0
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > limit) throw new Error('Release download exceeds its limit'); parts.push(next.value) } }
  finally { await reader.cancel().catch(() => {}) }
  return Buffer.concat(parts)
}
export async function stageRelease(requested: string, options: { home?: string; installed?: string; fetch?: typeof fetch; verify?: (file: string, tag: string) => Promise<void> } = {}): Promise<{ directory: string; downloaded: number; reused: number }> {
  if (!version(requested)) throw new Error('Expected a release version such as 0.12.0')
  const download = options.fetch ?? fetch, home = options.home ?? currentEngineHome(), installed = options.installed ?? path.dirname(process.execPath)
  const parent = path.join(home, 'updates'), destination = path.join(parent, requested)
  mkdirSync(parent, { recursive: true })
  if (existsSync(destination)) throw new Error('This version is already staged')
  const temporary = mkdtempSync(path.join(parent, '.staging-'))
  let downloaded = 0, reused = 0
  try {
    const manifestFile = path.join(temporary, 'manifest.json')
    writeFileSync(manifestFile, await bounded(await download(`${releaseURL}/v${requested}/manifest-${process.platform}-${process.arch}.json`, { signal: AbortSignal.timeout(30000) }), 1024 * 1024))
    const verify = options.verify ?? (async (file: string, tag: string) => {
      const child = Bun.spawn(['gh', 'attestation', 'verify', file, '--repo', repo, '--signer-workflow', `${repo}/.github/workflows/release.yml`, '--source-ref', `refs/tags/${tag}`, '--deny-self-hosted-runners'], { stdout: 'inherit', stderr: 'inherit', windowsHide: true })
      if (await child.exited !== 0) throw new Error('Release signature verification failed')
    })
    await verify(manifestFile, `v${requested}`)
    const manifest = validateManifest(JSON.parse(readFileSync(manifestFile, 'utf8')), requested)
    const local = new Map<string, Uint8Array>()
    for (const file of manifest.files) {
      try {
        const bytes = readFileSync(path.join(installed, file.path))
        if (bytes.length > 2 ** 30) continue
        for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) { const block = bytes.subarray(offset, offset + CHUNK_SIZE); local.set(digest(block), block) }
      } catch {}
    }
    for (const file of manifest.files) {
      const blocks: Uint8Array[] = []
      for (const chunk of file.chunks) {
        let block = local.get(chunk.sha256)
        if (block) reused++
        else {
          const compressed = await bounded(await download(`${releaseURL}/v${chunk.version}/${chunk.sha256}.gz`, { signal: AbortSignal.timeout(30000) }), CHUNK_SIZE + 65536)
          block = await bounded(new Response(new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip'))), CHUNK_SIZE)
          if (block.length > CHUNK_SIZE || digest(block) !== chunk.sha256) throw new Error('Update chunk digest mismatch')
          downloaded++
          local.set(chunk.sha256, block)
        }
        blocks.push(block)
      }
      const bytes = Buffer.concat(blocks)
      if (bytes.length !== file.size || digest(bytes) !== file.sha256) throw new Error('Update file digest mismatch')
      const target = path.join(temporary, file.path)
      writeFileSync(target, bytes)
      if (file.executable) chmodSync(target, 0o755)
    }
    if (process.platform === 'darwin' && manifest.files.some((file) => file.path === 'Info.plist')) {
      const contents = path.join(temporary, 'Hiroshi.app', 'Contents'), bin = path.join(contents, 'MacOS')
      mkdirSync(bin, { recursive: true })
      for (const file of manifest.files) renameSync(path.join(temporary, file.path), path.join(file.path === 'Info.plist' ? contents : bin, file.path))
    }
    renameSync(temporary, destination)
    return { directory: destination, downloaded, reused }
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true })
    throw error
  }
}
