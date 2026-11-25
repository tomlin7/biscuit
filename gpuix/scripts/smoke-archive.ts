import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { extractReleaseArchive, releaseNames } from './release-artifacts'
import { smokePackaged } from './smoke'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
const target = `${process.platform}-${process.arch}`
const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-archive-'))
try {
  console.log(`[archive smoke] extracting and verifying ${target}`)
  const binaryDirectory = await extractReleaseArchive(path.resolve('dist/release'), version, target, path.join(home, 'extracted'), (stage) => console.log(`[archive smoke] ${stage}`))
  await smokePackaged(binaryDirectory)
  console.log(`Extracted release archive verified: ${releaseNames(version, target).archive}`)
} finally {
  for (let attempt = 0; attempt < 20; attempt++) {
    try { rmSync(home, { recursive: true, force: true }); break }
    catch { await Bun.sleep(100) }
  }
}
