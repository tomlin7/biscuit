import { createReadStream, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { CHUNK_SIZE, validateManifest, type ReleaseManifest } from '../src/shell/updates'

// The pinned Bun and GPUIX versions must both ship a native artifact.
export const RELEASE_TARGETS = ['win32-x64', 'darwin-arm64', 'linux-x64'] as const

export function releaseNames(version: string, target: string) {
  const archive = `hiroshi-${version}-${target}.tar.gz`
  return { archive, checksum: `${archive}.sha256`, manifest: `manifest-${target}.json` }
}

export async function hashFile(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const block of createReadStream(file)) hash.update(block)
  return hash.digest('hex')
}

export function readReleaseManifest(directory: string, version: string, target: string): ReleaseManifest {
  const [platform, arch] = target.split('-')
  const manifest = validateManifest(JSON.parse(readFileSync(path.join(directory, releaseNames(version, target).manifest), 'utf8')), version, { platform, arch })
  const suffix = platform === 'win32' ? '.exe' : ''
  const required = [`hiroshi${suffix}`, `hiroshi-engine${suffix}`, 'VERSION', 'LICENSES.txt', ...(platform === 'darwin' ? ['Info.plist', 'libhiroshi-window.dylib'] : [])]
  for (const file of required) if (!manifest.files.some((entry) => entry.path === file && entry.size > 0)) throw new Error(`Missing ${target} payload: ${file}`)
  for (const file of manifest.files) if (/^hiroshi(?:-engine)?(?:\.exe)?$/.test(file.path) && !file.executable) throw new Error(`Missing executable flag: ${file.path}`)
  return manifest
}

export async function verifyArchiveChecksum(directory: string, version: string, target: string): Promise<void> {
  const names = releaseNames(version, target)
  const checksum = readFileSync(path.join(directory, names.checksum), 'utf8')
  const match = /^([a-f0-9]{64})  ([^\r\n]+)\r?\n?$/.exec(checksum)
  if (!match || match[2] !== names.archive || statSync(path.join(directory, names.archive)).size === 0 || await hashFile(path.join(directory, names.archive)) !== match[1]) throw new Error(`Archive checksum mismatch: ${target}`)
}

/** Extract only the expected payload, then verify every archived byte. */
export async function extractReleaseArchive(release: string, version: string, target: string, extracted: string, progress: (stage: string) => void = () => {}): Promise<string> {
  const manifest = readReleaseManifest(release, version, target)
  progress('checking archive checksum')
  await verifyArchiveChecksum(release, version, target)
  const names = releaseNames(version, target), mac = target.startsWith('darwin-')
  const payloadPath = (file: string) => mac ? `Hiroshi.app/Contents/${file === 'Info.plist' ? file : `MacOS/${file}`}` : file
  const entries = new Set([names.manifest, ...manifest.files.map((file) => payloadPath(file.path))])
  progress('listing archive entries')
  const listing = Bun.spawnSync(['tar', '-tzf', path.join(release, names.archive)], { windowsHide: true })
  if (listing.exitCode) throw new Error(listing.stderr.toString())
  const seen = new Set<string>()
  for (const name of listing.stdout.toString().trim().split(/\r?\n/)) {
    if (mac && ['Hiroshi.app/', 'Hiroshi.app/Contents/', 'Hiroshi.app/Contents/MacOS/'].includes(name)) continue
    if (!entries.has(name) || seen.has(name)) throw new Error(`Unexpected or duplicate archive entry: ${name}`)
    seen.add(name)
  }
  if (seen.size !== entries.size) throw new Error('Archive payload is incomplete')
  mkdirSync(extracted)
  progress('extracting archive entries')
  const unpack = Bun.spawnSync(['tar', '-xzf', path.join(release, names.archive), '-C', extracted], { windowsHide: true })
  if (unpack.exitCode) throw new Error(unpack.stderr.toString())
  progress('checking extracted manifest')
  if (await hashFile(path.join(extracted, names.manifest)) !== await hashFile(path.join(release, names.manifest))) throw new Error('Archive manifest does not match release manifest')
  for (const file of manifest.files) {
    progress(`checking payload: ${file.path}`)
    const destination = path.join(extracted, payloadPath(file.path)), stat = lstatSync(destination)
    if (!stat.isFile() || stat.size !== file.size || await hashFile(destination) !== file.sha256) throw new Error(`Archive payload mismatch: ${file.path}`)
    if (process.platform !== 'win32' && !target.startsWith('win32-') && file.executable && (stat.mode & 0o111) === 0) throw new Error(`Archive lost executable permissions: ${file.path}`)
  }
  if (readFileSync(path.join(extracted, payloadPath('VERSION')), 'utf8').trim() !== version) throw new Error('Archive VERSION mismatch')
  return path.join(extracted, mac ? 'Hiroshi.app/Contents/MacOS' : '.')
}

async function verifyBlob(file: string, expected: string): Promise<void> {
  if (statSync(file).size > CHUNK_SIZE + 65536) throw new Error('Oversized release chunk')
  const reader = Bun.file(file).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  const hash = createHash('sha256')
  let size = 0
  try {
    while (true) {
      const block = await reader.read()
      if (block.done) break
      size += block.value.length
      if (size > CHUNK_SIZE) throw new Error('Oversized release chunk')
      hash.update(block.value)
    }
    if (hash.digest('hex') !== expected) throw new Error('Release chunk digest mismatch')
  } finally { await reader.cancel().catch(() => {}) }
}

/** Validate every supported target before making any GitHub mutation. */
export async function verifyReleaseAssets(directory: string, version: string): Promise<string[]> {
  if (!/^0\.\d{1,3}\.\d+$/.test(version)) throw new Error('Invalid release version')
  const files = new Set<string>()
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-publication-'))
  try {
    for (const target of RELEASE_TARGETS) {
      const manifest = readReleaseManifest(directory, version, target)
      for (const name of Object.values(releaseNames(version, target))) files.add(path.join(directory, name))
      for (const file of manifest.files) for (const chunk of file.chunks) {
        const source = chunk.version.split('.').map(Number), current = version.split('.').map(Number)
        if (source[1]! > current[1]! || source[1] === current[1] && source[2]! > current[2]!) throw new Error('Release chunk refers to a future version')
        if (chunk.version !== version) continue // Already published immutable chunk.
        const blob = path.join(directory, 'blobs', `${chunk.sha256}.gz`)
        if (!files.has(blob)) { await verifyBlob(blob, chunk.sha256); files.add(blob) }
      }
      await extractReleaseArchive(path.resolve(directory), version, target, path.join(temporary, target))
      rmSync(path.join(temporary, target), { recursive: true, force: true })
    }
    return [...files]
  } finally { rmSync(temporary, { recursive: true, force: true }) }
}
