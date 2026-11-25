import { afterEach, expect, test } from 'bun:test'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { CHUNK_SIZE, digest, makeManifest, type ReleaseManifest } from '../../src/shell/updates'
import { extractReleaseArchive, hashFile, readReleaseManifest, releaseNames, RELEASE_TARGETS, verifyReleaseAssets } from '../../scripts/release-artifacts'

const VERSION = '0.12.2'
const homes: string[] = []
afterEach(() => { for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true }) })

async function fixture() {
  const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-release-test-'))
  homes.push(home)
  const release = path.join(home, 'release')
  mkdirSync(release)
  for (const target of RELEASE_TARGETS) {
    const [platform, arch] = target.split('-'), suffix = platform === 'win32' ? '.exe' : ''
    const source = path.join(home, target)
    mkdirSync(source)
    const files = [`hiroshi${suffix}`, `hiroshi-engine${suffix}`, 'VERSION', 'LICENSES.txt', ...(platform === 'darwin' ? ['Info.plist', 'libhiroshi-window.dylib'] : [])]
    for (const file of files) {
      writeFileSync(path.join(source, file), file === 'VERSION' ? `${VERSION}\n` : `${target} ${file}`)
      chmodSync(path.join(source, file), 0o755)
    }
    const manifest = { ...makeManifest(source, files, VERSION, path.join(release, 'blobs')), platform: platform!, arch: arch! }
    writeFileSync(path.join(release, releaseNames(VERSION, target).manifest), JSON.stringify(manifest))
    await archive(home, target, manifest)
  }
  return { home, release }
}

async function archive(home: string, target: string, manifest: ReleaseManifest, extra?: string) {
  const release = path.join(home, 'release'), source = path.join(home, target), names = releaseNames(VERSION, target)
  const staging = path.join(home, `stage-${target}`)
  mkdirSync(staging, { recursive: true })
  for (const file of manifest.files) {
    const relative = target.startsWith('darwin-') ? `Hiroshi.app/Contents/${file.path === 'Info.plist' ? file.path : `MacOS/${file.path}`}` : file.path
    const destination = path.join(staging, relative)
    mkdirSync(path.dirname(destination), { recursive: true })
    copyFileSync(path.join(source, file.path), destination)
    chmodSync(destination, statSync(path.join(source, file.path)).mode & 0o777)
  }
  copyFileSync(path.join(release, names.manifest), path.join(staging, names.manifest))
  if (extra) writeFileSync(path.join(staging, extra), 'unexpected payload')
  const entries = target.startsWith('darwin-') ? ['Hiroshi.app'] : manifest.files.map((file) => file.path)
  const child = Bun.spawnSync(['tar', '-czf', path.join(release, names.archive), '-C', staging, ...entries, names.manifest, ...(extra ? [extra] : [])], { windowsHide: true })
  if (child.exitCode) throw new Error(child.stderr.toString())
  writeFileSync(path.join(release, names.checksum), `${await hashFile(path.join(release, names.archive))}  ${names.archive}\n`)
}

test('complete release validates all three targets, extracts their real layouts and excludes stale uploads', async () => {
  const { home, release } = await fixture()
  writeFileSync(path.join(release, 'stale.tar.gz'), 'old build')
  const uploads = await verifyReleaseAssets(release, VERSION)
  expect(uploads.filter((file) => file.endsWith('.tar.gz'))).toHaveLength(3)
  expect(uploads.filter((file) => file.endsWith('.sha256'))).toHaveLength(3)
  expect(uploads.some((file) => file.endsWith('stale.tar.gz'))).toBe(false)
  for (const target of RELEASE_TARGETS) {
    const bin = await extractReleaseArchive(release, VERSION, target, path.join(home, `out-${target}`))
    expect(readFileSync(path.join(bin, 'VERSION'), 'utf8').trim()).toBe(VERSION)
    if (target.startsWith('darwin-')) expect(bin.endsWith(path.join('Hiroshi.app', 'Contents', 'MacOS'))).toBe(true)
  }
})

for (const part of ['archive', 'checksum', 'manifest'] as const) test(`a missing platform ${part} blocks the whole release`, async () => {
  const { release } = await fixture()
  rmSync(path.join(release, releaseNames(VERSION, 'linux-x64')[part]))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow()
})

test('truncated archive or checksum for the wrong filename blocks publication', async () => {
  const { release } = await fixture(), names = releaseNames(VERSION, 'win32-x64')
  const original = readFileSync(path.join(release, names.archive))
  writeFileSync(path.join(release, names.archive), original.subarray(0, original.length - 1))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('checksum mismatch')
  writeFileSync(path.join(release, names.archive), original)
  writeFileSync(path.join(release, names.checksum), `${digest(original)}  other.tar.gz\n`)
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('checksum mismatch')
})

test('a manifest cannot identify another architecture, version or omit the sidecar', async () => {
  const { release } = await fixture(), file = path.join(release, releaseNames(VERSION, 'linux-x64').manifest)
  const original = JSON.parse(readFileSync(file, 'utf8')) as ReleaseManifest
  for (const changed of [{ ...original, arch: 'arm64' }, { ...original, version: '0.12.1' }, { ...original, files: original.files.filter((entry) => entry.path !== 'hiroshi-engine') }]) {
    writeFileSync(file, JSON.stringify(changed))
    await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow()
  }
})

test('missing, damaged and oversized new delta chunks block publication', async () => {
  const { release } = await fixture()
  const chunk = readReleaseManifest(release, VERSION, 'win32-x64').files[0]!.chunks[0]!
  const file = path.join(release, 'blobs', `${chunk.sha256}.gz`)
  rmSync(file)
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow()
  writeFileSync(file, Bun.gzipSync(Buffer.from('damaged')))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('chunk digest mismatch')
  writeFileSync(file, Bun.gzipSync(Buffer.alloc(CHUNK_SIZE + 1)))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('Oversized release chunk')
})

test('existing chunks may reference an earlier release, never a future one', async () => {
  const { home, release } = await fixture(), file = path.join(release, releaseNames(VERSION, 'linux-x64').manifest)
  const manifest = readReleaseManifest(release, VERSION, 'linux-x64')
  manifest.files[0]!.chunks[0]!.version = '0.12.0'
  writeFileSync(file, JSON.stringify(manifest))
  await archive(home, 'linux-x64', manifest)
  await expect(verifyReleaseAssets(release, VERSION)).resolves.toBeArray()
  manifest.files[0]!.chunks[0]!.version = '0.12.3'
  writeFileSync(file, JSON.stringify(manifest))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('future version')
})

test('an intact checksum does not hide a wrong archived payload or an unexpected entry', async () => {
  const { home, release } = await fixture(), target = 'win32-x64'
  const manifest = readReleaseManifest(release, VERSION, target)
  const source = path.join(home, target, 'hiroshi-engine.exe'), original = readFileSync(source)
  writeFileSync(source, 'incorrect sidecar')
  await archive(home, target, manifest)
  await expect(extractReleaseArchive(release, VERSION, target, path.join(home, 'bad-payload'))).rejects.toThrow('payload mismatch')
  writeFileSync(source, original)
  await archive(home, target, manifest, 'leftover.exe')
  await expect(extractReleaseArchive(release, VERSION, target, path.join(home, 'extra'))).rejects.toThrow('Unexpected')
})

test('the embedded manifest must match the separately published manifest', async () => {
  const { home, release } = await fixture(), target = 'linux-x64'
  const manifest = readReleaseManifest(release, VERSION, target)
  // Metadata can be valid in both documents and still describe different bytes.
  manifest.files[0]!.sha256 = 'a'.repeat(64)
  writeFileSync(path.join(release, releaseNames(VERSION, target).manifest), JSON.stringify(manifest))
  await expect(extractReleaseArchive(release, VERSION, target, path.join(home, 'mismatch'))).rejects.toThrow('manifest does not match')
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('manifest does not match')
})

test('a correctly hashed VERSION file still must identify the requested release', async () => {
  const { home, release } = await fixture(), target = 'linux-x64'
  const manifest = readReleaseManifest(release, VERSION, target), bytes = Buffer.from('0.99.0\n')
  const file = manifest.files.find((entry) => entry.path === 'VERSION')!
  Object.assign(file, { size: bytes.length, sha256: digest(bytes), chunks: [{ sha256: digest(bytes), version: VERSION }] })
  writeFileSync(path.join(home, target, 'VERSION'), bytes)
  writeFileSync(path.join(release, 'blobs', `${digest(bytes)}.gz`), Bun.gzipSync(bytes))
  writeFileSync(path.join(release, releaseNames(VERSION, target).manifest), JSON.stringify(manifest))
  await archive(home, target, manifest)
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('VERSION mismatch')
})

if (process.platform !== 'win32') test('Unix archives must retain executable permissions', async () => {
  const { home, release } = await fixture(), target = 'linux-x64'
  chmodSync(path.join(home, target, 'hiroshi'), 0o600)
  await archive(home, target, readReleaseManifest(release, VERSION, target))
  await expect(verifyReleaseAssets(release, VERSION)).rejects.toThrow('lost executable permissions')
})
