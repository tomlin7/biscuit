import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { T3DAppShell } from './src/layout/T3DAppShell'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

function testIds(renderer: any): string[] {
  const ids: string[] = []
  const walk = (node: any) => {
    if (node.testId) ids.push(node.testId)
    for (const child of node.children ?? []) walk(child)
  }
  walk(JSON.parse(renderer.getAutomationTree()))
  return ids
}

describeNative('T3D Clean Empty Dockable Layout', () => {
  it('mounts titlebar and empty dock layout with zero bloat', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<T3DAppShell />)
    const app = await connectTest(renderer)

    const titlebar = app.getByTestId('header-titlebar')
    await titlebar.waitFor({ timeoutMs: 5_000 })
    expect(await titlebar.bounds()).toBeDefined()

    const dockArea = app.getByTestId('t3d-dock-workspace-area')
    await dockArea.waitFor({ timeoutMs: 5_000 })
    expect(await dockArea.bounds()).toBeDefined()

    // Verifies that it renders the clean empty pane
    const painted = renderer.getPaintedText()
    expect(painted).toContain('Morsel')
    expect(painted).toContain('Empty Pane')
    expect(painted).toContain('+ New Tab')

    // No extra sidebars or bloated panels
    const ids = testIds(renderer)
    expect(ids).not.toContain('t3d-sidebar')
    expect(ids).not.toContain('t3d-activity-bar')

    await app.close()
  })

  it('adds a new tab to the empty dock pane when clicking + New Tab', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<T3DAppShell />)
    const app = await connectTest(renderer)

    // Find the empty pane button
    let addBtnId: string | undefined
    for (let i = 0; i < 40; i++) {
      const ids = testIds(renderer)
      addBtnId = ids.find((id) => id.startsWith('empty-add-tab-btn-'))
      if (addBtnId) break
      await new Promise((r) => setTimeout(r, 25))
    }
    expect(addBtnId).toBeDefined()

    if (addBtnId) {
      const addBtn = app.getByTestId(addBtnId)
      await addBtn.waitFor({ timeoutMs: 5_000 })
      await addBtn.click()

      let found = false
      for (let i = 0; i < 40; i++) {
        if (renderer.getPaintedText().includes('Dockable Pane Content')) {
          found = true
          break
        }
        await new Promise((r) => setTimeout(r, 25))
      }
      expect(found).toBe(true)
    }

    await app.close()
  })

  it('splits the dock group into two panes', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<T3DAppShell />)
    const app = await connectTest(renderer)

    // First add a tab
    let addBtnId: string | undefined
    for (let i = 0; i < 40; i++) {
      const ids = testIds(renderer)
      addBtnId = ids.find((id) => id.startsWith('empty-add-tab-btn-'))
      if (addBtnId) break
      await new Promise((r) => setTimeout(r, 25))
    }
    expect(addBtnId).toBeDefined()

    if (addBtnId) {
      const addBtn = app.getByTestId(addBtnId)
      await addBtn.waitFor({ timeoutMs: 5_000 })
      await addBtn.click()

      let splitRightId: string | undefined
      for (let i = 0; i < 40; i++) {
        const ids = testIds(renderer)
        splitRightId = ids.find((id) => id.startsWith('dock-split-h-btn-'))
        if (splitRightId) break
        await new Promise((r) => setTimeout(r, 25))
      }
      expect(splitRightId).toBeDefined()

      if (splitRightId) {
        const splitBtn = app.getByTestId(splitRightId)
        await splitBtn.waitFor({ timeoutMs: 5_000 })
        await splitBtn.click()

        let hasSplit = false
        for (let i = 0; i < 40; i++) {
          const ids = testIds(renderer)
          if (ids.some((id) => id.startsWith('dock-split-'))) {
            hasSplit = true
            break
          }
          await new Promise((r) => setTimeout(r, 25))
        }
        expect(hasSplit).toBe(true)
      }
    }

    await app.close()
  })
})
