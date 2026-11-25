import { expect, test } from 'bun:test'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { probeHome } from '../../scripts/probe-home'
import { startDaemon, tempHome } from './harness'

test('live probes reject unmarked user directories and already running probe daemons', async () => {
  const user = tempHome(), home = await probeHome()
  try {
    writeFileSync(join(user, 'keep.txt'), 'user data')
    await expect(probeHome(user)).rejects.toThrow()
    expect(readFileSync(join(user, 'keep.txt'), 'utf8')).toBe('user data')
    expect(await probeHome(home)).toBe(home)
    const daemon = await startDaemon({ home })
    try { await expect(probeHome(home)).rejects.toThrow('already owns') } finally { await daemon.stop() }
  } finally { rmSync(home, { recursive: true, force: true }); rmSync(user, { recursive: true, force: true }) }
})
