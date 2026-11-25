/**
 * Integration tests for the Hiroshi chat cockpit.
 * Tested through the GPUIX native test renderer, so the real tree is built,
 * painted and hit tested.
 *
 *   bun run test
 */

import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'

import { HiroshiApp } from './app'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

/** Every `testId` in the painted tree. */
function testIds(renderer: any): string[] {
  const ids: string[] = []
  const walk = (node: any) => {
    if (node.testId) ids.push(node.testId)
    for (const child of node.children ?? []) walk(child)
  }
  walk(JSON.parse(renderer.getAutomationTree()))
  return ids
}

/**
 * Wait until the element stops moving.
 *
 * The automation clicks the last painted bounds, so an element that is still
 * sliding into place has to settle before it is clicked.
 */
async function settle(locator: any): Promise<void> {
  let previous: any = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const bounds = await locator.bounds()
    if (previous && bounds.x === previous.x && bounds.y === previous.y) return
    previous = bounds
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

describeNative('Hiroshi chat cockpit', () => {
  it('mounts the sidebar, the header, the composer and the empty state', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    const painted = renderer.getPaintedText()

    // Sidebar
    expect(painted).toContain('New Task')
    expect(painted).toContain('Search')
    expect(painted).toContain('Today')
    expect(painted).toContain('This Year')
    // Header and the empty state of a fresh task
    expect(painted).toContain('New task')
    expect(painted).toContain('What should we build in kale?')
    // Composer
    expect(painted).toContain('Ask anything, @ to mention, / for workflows')
    expect(painted).toContain('Grok 4.6')
    // Workspace footer
    expect(painted).toContain('kale')
    expect(painted).toContain('Local')
    expect(painted).toContain('master')

    await app.close()
  })

  it('switches to another thread and shows its transcript', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    expect(renderer.getPaintedText()).toContain('What should we build in kale?')

    await app.getByTestId('thread-c1').click()

    // The empty state belongs to the task that was selected before.
    expect(renderer.getPaintedText()).not.toContain('What should we build in kale?')

    await app.close()
  })

  it('creates a new task from the sidebar', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    const before = testIds(renderer).filter((id) => id.startsWith('thread-task-')).length
    await app.getByTestId('new-task').click()
    const after = testIds(renderer).filter((id) => id.startsWith('thread-task-')).length

    expect(after).toBe(before + 1)

    await app.close()
  })

  it('deletes a thread from the sidebar', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    // The delete button belongs to the active thread.
    await app.getByTestId('thread-c1').click()
    expect(testIds(renderer)).toContain('delete-c1')
    expect(renderer.getPaintedText()).not.toContain('What should we build in kale?')

    await app.getByTestId('delete-c1').click()

    // The deleted thread was the active one, so the empty state is back.
    // The row itself stays in the tree: the exit animation never settles
    // without frames, and the test renderer only paints on demand.
    expect(renderer.getPaintedText()).toContain('What should we build in kale?')

    await app.close()
  })

  it('opens the command palette from the sidebar', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    expect(testIds(renderer)).not.toContain('command-palette-input')
    await app.getByTestId('search').click()
    expect(testIds(renderer)).toContain('command-palette-input')

    await app.close()
  })

  it('opens the right panel and switches the active surface', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    // The header gives the panel toggle up when the panel is open.
    expect(testIds(renderer)).toContain('panel-right-open')

    // The panel slides in, so the cards only hit test once it is settled.
    // The clock is frozen while the panel opens and then advanced, so the
    // test does not depend on how fast the machine is.
    await app.clock.pause()
    await app.getByTestId('panel-right-open').click()
    expect(testIds(renderer)).not.toContain('panel-right-open')
    expect(testIds(renderer)).toContain('surface-panel-toggle')
    await app.clock.fastForward(300)
    await app.clock.resume()

    const card = app.getByTestId('surface-card-terminal')
    await settle(card)
    await card.click()
    expect(testIds(renderer)).toContain('surface-close-tab')

    await app.close()
  })

  it('sends a draft from the composer', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    await app.getByTestId('composer').fill('ship the drag fix')
    await app.getByTestId('send').click()

    expect(renderer.getPaintedText()).toContain('ship the drag fix')

    await app.close()
  })

  it('opens the settings view and comes back', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    await app.getByTestId('settings').click()
    expect(renderer.getPaintedText()).toContain('General')
    expect(testIds(renderer)).toContain('settings-back')

    await app.getByTestId('settings-back').click()
    expect(renderer.getPaintedText()).toContain('What should we build in kale?')

    await app.close()
  })
})
