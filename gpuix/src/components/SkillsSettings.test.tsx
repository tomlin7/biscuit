import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import type { SkillInfo, SkillInventory } from '../../engine/src/protocol'
import { initialSnapshot } from '../engine/reducer'
import { SkillsSettings } from './SkillsSettings'

function skill(id: string, name: string, source: string): SkillInfo { return { id, name, description: `Description of ${name}`, path: `/skills/${name}/SKILL.md`, bytes: 5400, updatedAt: Date.now(), hash: 'hash', enabled: true, invoke: `/${name}`, origins: [{ source, scope: 'user', path: `/skills/${name}`, managed: false, linked: false }] } }
async function setup(options: { update?: EngineHandle['updateSkill']; width?: number } = {}) {
  let inventory: SkillInventory = { revision: 0, scannedAt: Date.now(), truncated: false, warnings: [], skills: [skill('alpha', 'find-skills', 'shared'), skill('beta', 'terminal-guide', 'cursor')] }
  const opened: string[] = [], removed: string[] = []
  const engine = { snapshot: { ...initialSnapshot(), status: 'ready', sessionID: 'task' }, skills: async () => inventory,
    skillDocument: async ({ skillID }: { skillID: string }) => { const item = inventory.skills.find((s) => s.id === skillID)!; return { skill: item, raw: 'raw', markdown: `# ${item.name}\nReal document for ${item.name}` } },
    updateSkill: options.update ?? (async ({ skillID, enabled }: { skillID: string; enabled: boolean }) => { inventory = { ...inventory, revision: inventory.revision + 1, skills: inventory.skills.map((s) => s.id === skillID ? { ...s, enabled } : s) }; return inventory }),
    removeSkill: async ({ skillID }: { skillID: string }) => { removed.push(skillID); inventory = { ...inventory, skills: inventory.skills.filter((s) => s.id !== skillID) }; return { inventory, removedTo: '/skills/.hiroshi-skill-trash/removed' } },
  } as unknown as EngineHandle
  const width = options.width ?? 900, { render, renderer } = createTestRoot({ width, height: 600 })
  render(<div style={{ width, height: 600, display: 'flex', flexDirection: 'column', backgroundColor: '#191919' }}><SkillsSettings engine={engine} openPath={async (path) => { opened.push(path) }} renderMarkdown={(source) => <text>{source}</text>} /></div>)
  const app = await connectTest(renderer)
  await app.getByTestId('skill-alpha').waitFor()
  return { app, opened, removed }
}
;(hasNativeTestRenderer ? describe : describe.skip)('installed skills settings', () => {
  it('searches and filters real inventory, reads the selected document, and opens the actual file and folder', async () => {
    const { app, opened } = await setup()
    try {
      await app.getByTestId('skill-document').waitFor()
      expect(await app.getByTestId('skill-name').textContent()).toBe('find-skills')
      expect(await app.getByTestId('skill-document').textContent()).toContain('Real document for find-skills')
      await app.getByTestId('skill-open').click(); await expect.poll(() => opened).toEqual(['/skills/find-skills/SKILL.md'])
      // The OS-action promise can resolve before React's host scheduler has
      // painted the enabled buttons. Native clock ticks do not run JS timers.
      await new Promise((resolve) => setTimeout(resolve, 50))
      await app.clock.pause(); await app.clock.fastForward(320); await app.clock.resume()
      mkdirSync('screenshots', { recursive: true }); await app.screenshot({ path: path.resolve('screenshots/native-skills-controls.png') }); writeFileSync('screenshots/native-skills-controls.json', JSON.stringify(await app.call('getTree', {}), null, 2))
      await app.getByTestId('skill-folder').click(); await expect.poll(() => opened).toHaveLength(2)
      await app.clock.pause(); await app.clock.fastForward(320); await app.clock.resume()
      expect(opened[1]).toBe('/skills/find-skills')
      await app.getByTestId('skills-filter').click(); await app.getByTestId('skills-filter-cursor').waitFor(); await app.getByTestId('skills-filter-cursor').click()
      await expect.poll(() => app.getByTestId('skill-name').textContent()).toBe('terminal-guide')
      expect(await app.getByTestId('skills-count').textContent()).toBe('1 skill')
      await app.getByTestId('skills-search').fill('no match')
      await app.getByTestId('skills-empty').waitFor(); expect(await app.getByTestId('skills-count').textContent()).toBe('0 skills')
    } finally { await app.close() }
  })
  it('persists an enabled state and asks before reversible removal', async () => {
    const { app, removed } = await setup()
    try {
      await app.getByTestId('skill-document').waitFor()
      await app.getByTestId('skill-enabled').click()
      await expect.poll(() => app.getByTestId('skill-status').textContent()).toBe('Disabled')
      await app.clock.pause(); await app.clock.fastForward(320); await app.clock.resume()
      await app.getByTestId('skill-delete').click(); await app.getByTestId('skill-delete-dialog').waitFor()
      expect(removed).toEqual([])
      await app.getByTestId('skill-delete-cancel').click(); expect(removed).toEqual([])
      await app.getByTestId('skill-delete').click(); await app.getByTestId('skill-delete-confirm').waitFor(); await app.getByTestId('skill-delete-confirm').click()
      await expect.poll(() => removed).toEqual(['alpha'])
      await expect.poll(() => app.getByTestId('skill-name').textContent()).toBe('terminal-guide')
      expect(await app.getByTestId('skills-notice').textContent()).toContain('Moved to')
    } finally { await app.close() }
  })
  it('keeps the prior enabled state when saving fails', async () => {
    const { app } = await setup({ update: async () => { throw new Error('Skills changed in another window. Refresh before saving.') } })
    try {
      await app.getByTestId('skill-document').waitFor(); await app.getByTestId('skill-enabled').click()
      await app.getByTestId('skills-error').waitFor()
      expect(await app.getByTestId('skill-status').textContent()).toBe('Enabled')
      expect(await app.getByTestId('skills-error').textContent()).toContain('another window')
    } finally { await app.close() }
  })
})
