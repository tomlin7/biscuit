import { readFileSync, writeFileSync } from 'node:fs'
import { verifyReleaseAssets } from './release-artifacts'
const version = JSON.parse(readFileSync('package.json', 'utf8')).version, tag = `v${version}`
if (process.env.GITHUB_REF_NAME !== tag) throw new Error('Release tag does not match package version')
const files = await verifyReleaseAssets('assets', version)
const run = async (args: string[]) => { const child = Bun.spawn(['gh', ...args], { stdout: 'inherit', stderr: 'inherit' }); if (await child.exited) throw new Error('Release publication failed') }
const changelog = readFileSync('CHANGELOG.md', 'utf8').split(`## [${version}]`)[1]?.split('\n## [')[0]
if (!changelog) throw new Error('Missing release notes')
writeFileSync('release-notes.md', `Hiroshi ${version}\n${changelog}\n\nArchives include the compiled cockpit and engine sidecar. Verify with gh attestation verify <archive> --repo hiroshi-os/Hiroshi. Signatures establish GitHub build provenance; Apple notarization and Windows Authenticode are not included.\n`)
await run(['release', 'create', tag, '--verify-tag', '--draft', '--title', `Hiroshi ${version}`, '--notes-file', 'release-notes.md'])
for (let i = 0; i < files.length; i += 50) await run(['release', 'upload', tag, ...files.slice(i, i + 50)])
await run(['release', 'edit', tag, '--draft=false'])
