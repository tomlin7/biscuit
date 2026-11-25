import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { digest, makeManifest, validateManifest, type ReleaseManifest } from '../src/shell/updates'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${version}`) throw new Error('Tag and package version disagree')
if (!readFileSync('CHANGELOG.md', 'utf8').includes(`## [${version}]`)) throw new Error('Missing changelog release')
const target = `${process.platform}-${process.arch}`
const release = path.resolve('dist', 'release'), blobs = path.join(release, 'blobs')
mkdirSync(release, { recursive: true })
let previous: ReleaseManifest | undefined
try { const candidate = JSON.parse(readFileSync(`tmp/previous/manifest-${target}.json`, 'utf8')); previous = validateManifest(candidate, candidate.version) } catch {}
const files = readdirSync('dist').filter((name) => /^(hiroshi(?:-engine)?(?:\.exe)?|libhiroshi-window\.dylib|Info\.plist|VERSION|LICENSES\.txt)$/.test(name))
const manifest = makeManifest(path.resolve('dist'), files, version, blobs, previous)
const manifestPath = path.join(release, `manifest-${target}.json`)
writeFileSync(manifestPath, JSON.stringify(manifest))
const archive = `hiroshi-${version}-${target}.tar.gz`
const child = Bun.spawnSync(['tar', '-czf', path.join(release, archive), '-C', path.resolve('dist'), ...(process.platform === 'darwin' ? ['Hiroshi.app'] : files), '-C', release, `manifest-${target}.json`], { windowsHide: true })
if (child.exitCode) throw new Error(child.stderr.toString())
writeFileSync(path.join(release, `${archive}.sha256`), `${digest(readFileSync(path.join(release, archive)))}  ${archive}\n`)
console.log(`Release ready: ${archive}`)
