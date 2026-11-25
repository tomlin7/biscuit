import { expect, test } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDaemon, tempHome } from './harness'

test('internet management defaults off, remains private and persists explicit disabled intent', async () => {
  const daemon = await startDaemon()
  try {
    expect(await daemon.client.internetSettings()).toMatchObject({ revision: 0, enabled: false, state: 'disabled', url: null })
    await expect(daemon.client.createPairing({ remote: true })).rejects.toMatchObject({ code: 'internet_unavailable' })
    expect(await daemon.client.updateInternet({ revision: 0, enabled: false })).toMatchObject({ revision: 1, enabled: false })
    await expect(daemon.client.updateInternet({ revision: 0, enabled: true })).rejects.toMatchObject({ code: 'internet_revision' })
    expect((await daemon.client.health()).pid).toBe(daemon.health.pid)
  } finally { await daemon.stop() }
})

test('invalid internet configuration cannot block local daemon startup or enable remote access', async () => {
  const home = tempHome(); writeFileSync(join(home, 'internet.json'), '{broken')
  const daemon = await startDaemon({ home })
  try {
    expect(await daemon.client.internetSettings()).toMatchObject({ enabled: false, state: 'failed', url: null })
    await expect(daemon.client.updateInternet({ revision: 0, enabled: true })).rejects.toMatchObject({ code: 'internet_configuration' })
    expect((await daemon.client.health()).pid).toBe(daemon.health.pid)
  } finally { await daemon.stop() }
})
