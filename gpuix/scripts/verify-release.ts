import { readFileSync } from 'node:fs'
import { verifyReleaseAssets } from './release-artifacts'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
const files = await verifyReleaseAssets(process.argv[2] ?? 'assets', version)
console.log(`Verified complete Hiroshi ${version} release: ${files.length} upload files; no GitHub changes`)
