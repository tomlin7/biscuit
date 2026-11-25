import { expect, test } from 'bun:test'
import { writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { startDaemon, tempHome, until } from './harness'

test('projectless tasks have distinct managed workspaces, durable histories and no project-list entries', async () => {
  const home = tempHome(); let daemon = await startDaemon({ home })
  try {
    const { session: a } = await daemon.client.createSession({ projectless: true })
    const { session: b } = await daemon.client.createSession({ projectless: true })
    expect(a.projectless).toBe(true); expect(b.projectless).toBe(true)
    expect(a.cwd).not.toBe(b.cwd)
    expect(relative(join(home, 'workspaces', 'scratch'), a.cwd)).not.toStartWith('..')
    writeFileSync(join(a.cwd, 'only-a.txt'), 'owned by a')
    expect(existsSync(join(b.cwd, 'only-a.txt'))).toBe(false)
    expect((await daemon.client.projects()).projects.some((item) => item.cwd === a.cwd || item.cwd === b.cwd)).toBe(false)
    await daemon.client.prompt({ id: a.id, text: 'a scratch conversation', model: 'local/echo' })
    await until(async () => (await daemon.client.session({ id: a.id })).steps[0]?.status === 'succeeded')
    expect((await daemon.client.session({ id: b.id })).messages).toHaveLength(0)
    await daemon.crash(); daemon = await startDaemon({ home })
    expect((await daemon.client.session({ id: a.id })).session).toMatchObject({ cwd: a.cwd, projectless: true })
    expect((await daemon.client.session({ id: a.id })).messages[0]?.text).toBe('a scratch conversation')
  } finally { await daemon.stop() }
}, 25000)
