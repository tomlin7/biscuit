import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { initialSnapshot } from '../engine/reducer'
import type { EngineHandle } from '../engine/use-engine'
import { ProjectSwitcher } from './ProjectSwitcher'

;(hasNativeTestRenderer ? describe : describe.skip)('native project selection', () => {
  it('requests a single directory, preserves cancellation, and passes the selected folder to the engine', async () => {
    const calls: unknown[] = [], opened: string[] = []; let selection: string[] | null = null, closed = 0
    const { render, renderer } = createTestRoot({ width: 1180, height: 820 })
    Object.defineProperty(renderer, 'promptForPaths', { value: async (options: unknown) => { calls.push(options); return selection }, configurable: true })
    const engine = { snapshot: { ...initialSnapshot(), status: 'ready', projects: [] }, openProject: async (cwd: string) => { opened.push(cwd) } } as unknown as EngineHandle
    render(<ProjectSwitcher engine={engine} cwd="/alpha" open onOpen={() => {}} onClose={() => closed++} />)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('project-choose-folder').click()
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(calls).toEqual([{ files: false, directories: true, multiple: false, prompt: 'Open project' }])
      expect(opened).toEqual([]); expect(closed).toBe(0)
      selection = ['/beta']
      await app.getByTestId('project-choose-folder').click()
      await expect.poll(() => opened).toEqual(['/beta'])
      expect(closed).toBe(1)
    } finally { await app.close() }
  })
  it('keeps the existing workspace visible on invalid input and offers unavailable project history', async () => {
    const selected: string[] = [], { render, renderer } = createTestRoot({ width: 1180, height: 820 })
    const engine = { snapshot: { ...initialSnapshot(), status: 'ready', projects: [{ id: 'gone', name: 'Removed project', cwd: '/removed', sessionID: 'ses_old', status: 'missing', detail: 'Open its current folder.' }] },
      openProject: async () => { throw new Error('Choose an existing folder that you can read.') }, selectSession: (id: string) => selected.push(id),
    } as unknown as EngineHandle
    render(<ProjectSwitcher engine={engine} cwd="/current" open onOpen={() => {}} onClose={() => {}} />)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('project-path').fill('/invalid')
      await app.getByTestId('project-open-path').click()
      await app.getByTestId('project-error').waitFor()
      expect(selected).toEqual([])
      expect(await app.getByTestId('project-error').textContent()).toContain('existing folder')
      await new Promise((resolve) => setTimeout(resolve, 40))
      await app.getByTestId('project-recent-gone').click()
      expect(selected).toEqual(['ses_old'])
    } finally { await app.close() }
  })
})
