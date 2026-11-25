import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import { initialSnapshot } from '../engine/reducer'
import { ProjectMenu } from './ProjectSwitcher'

;(hasNativeTestRenderer ? describe : describe.skip)('project menu', () => {
  it('filters existing projects, selects one, and creates an explicit scratch task', async () => {
    const opened: string[] = []; let scratch = false
    const engine = { snapshot: { ...initialSnapshot(), status: 'ready', sessionID: 'a', sessions: [{ id: 'a', cwd: '/alpha' }], projects: [
      { id: 'a', name: 'Alpha', cwd: '/alpha', status: 'ready', sessionID: 'a' }, { id: 'b', name: 'Beta', cwd: '/beta', status: 'ready', sessionID: 'b' }] },
      refreshProjects: async () => {}, openProject: async (cwd: string) => { opened.push(cwd) }, newSession: async (value: boolean) => { scratch = value },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 900, height: 650 })
    render(<ProjectMenu engine={engine} cwd="/alpha" onNewProject={() => {}} />)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('open-project').click(); await app.getByTestId('open-project-search').waitFor()
      await app.getByTestId('open-project-search').fill('Beta')
      await app.getByTestId('open-project-search').press('down'); await app.getByTestId('open-project-search').press('enter')
      await expect.poll(() => opened).toEqual(['/beta'])
      await expect.poll(async () => JSON.stringify(await app.call('getTree', {})).includes('open-project-menu')).toBe(false)
      await app.getByTestId('open-project').click(); await app.getByTestId('open-project-none').waitFor(); await app.getByTestId('open-project-none').click()
      await expect.poll(() => scratch).toBe(true)
    } finally { await app.close() }
  })
})
