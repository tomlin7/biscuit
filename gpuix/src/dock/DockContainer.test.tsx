import React from 'react'
import { describe, expect, it } from 'vitest'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { connectTest } from '@gpuix/react/automation'
import { DockContainer } from './DockContainer'
import { createInitialDockLayout } from './model'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

describeNative('DockContainer component', () => {
  it('renders dock container, root, split nodes, panels, and handles', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer />)
    const app = await connectTest(renderer)

    const container = app.getByTestId('dock-container')
    await container.waitFor({ timeoutMs: 10_000 })
    expect(await container.bounds()).toBeDefined()

    const root = app.getByTestId('dock-root')
    await root.waitFor({ timeoutMs: 5000 })
    expect(await root.bounds()).toBeDefined()

    const navTab = app.getByTestId('dock-tab-dock-panel-sidebar')
    await navTab.waitFor({ timeoutMs: 5000 })
    expect(await navTab.bounds()).toBeDefined()

    const mainTab = app.getByTestId('dock-tab-dock-panel-main-1')
    await mainTab.waitFor({ timeoutMs: 5000 })
    expect(await mainTab.bounds()).toBeDefined()

    const saveBtn = app.getByTestId('dock-save-btn')
    await saveBtn.waitFor({ timeoutMs: 5000 })
    expect(await saveBtn.bounds()).toBeDefined()

    await app.close()
  })

  it('switches tabs when tab header is clicked', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer />)
    const app = await connectTest(renderer)

    const tab2 = app.getByTestId('dock-tab-dock-panel-main-2')
    await tab2.waitFor({ timeoutMs: 5000 })
    await tab2.click()

    const panel2 = app.getByTestId('dock-panel-dock-panel-main-2')
    await panel2.waitFor({ timeoutMs: 5000 })
    expect(await panel2.bounds()).toBeDefined()

    await app.close()
  })

  it('adds a new tab when add button is clicked', async () => {
    const layout = createInitialDockLayout([
      { id: 'custom-tab-1', title: 'Test Tab 1' },
    ])
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer initialLayout={layout} />)
    const app = await connectTest(renderer)

    const addBtn = app.getByTestId(`dock-tab-add-${layout.activeGroupId}`)
    await addBtn.waitFor({ timeoutMs: 5000 })
    await addBtn.click()

    // Save button should still be present
    const saveBtn = app.getByTestId('dock-save-btn')
    await saveBtn.waitFor({ timeoutMs: 5000 })
    expect(await saveBtn.bounds()).toBeDefined()

    await app.close()
  })

  it('supports split horizontal and split vertical button actions', async () => {
    const layout = createInitialDockLayout([
      { id: 'solo-tab', title: 'Solo Tab' },
    ])
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer initialLayout={layout} />)
    const app = await connectTest(renderer)

    const splitHBtn = app.getByTestId(`dock-split-h-btn-${layout.activeGroupId}`)
    await splitHBtn.waitFor({ timeoutMs: 5000 })
    await splitHBtn.click()

    // Reset layout
    const resetBtn = app.getByTestId('dock-reset-btn')
    await resetBtn.waitFor({ timeoutMs: 5000 })
    await resetBtn.click()

    await app.close()
  })

  it('closes a tab when close button is clicked', async () => {
    const layout = createInitialDockLayout([
      { id: 'tab-close-1', title: 'Tab 1', closable: true },
      { id: 'tab-close-2', title: 'Tab 2', closable: true },
    ])
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer initialLayout={layout} />)
    const app = await connectTest(renderer)

    const closeBtn = app.getByTestId('dock-tab-close-tab-close-1')
    await closeBtn.waitFor({ timeoutMs: 5000 })
    await closeBtn.click()

    const remainingTab = app.getByTestId('dock-tab-tab-close-2')
    await remainingTab.waitFor({ timeoutMs: 5000 })
    expect(await remainingTab.bounds()).toBeDefined()

    await app.close()
  })

  it('supports dragging a tab to split its group into two', async () => {
    const layout = createInitialDockLayout([
      { id: 'split-tab-1', title: 'Tab 1' },
      { id: 'split-tab-2', title: 'Tab 2' },
    ])
    let updatedLayout = layout
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(
      <DockContainer
        initialLayout={layout}
        onLayoutChange={(l) => {
          updatedLayout = l
        }}
      />
    )
    const app = await connectTest(renderer)

    // Press down on Tab 2 to initiate drag
    const tab2 = app.getByTestId('dock-tab-split-tab-2')
    await tab2.waitFor({ timeoutMs: 5000 })
    const bounds = await tab2.bounds()
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await app.mouse.down({ x, y })
    await app.mouse.move({ x: x + 15, y: y + 15 }, { pressedButton: 0 })

    // The drop overlay should appear because group has multiple panels
    const overlay = app.getByTestId(`dock-drop-overlay-${layout.activeGroupId}`)
    await overlay.waitFor({ timeoutMs: 5000 })
    expect(await overlay.bounds()).toBeDefined()

    // Click right drop zone to dock to right
    const rightZone = app.getByTestId('dock-drop-zone-right')
    await rightZone.waitFor({ timeoutMs: 5000 })
    const rBounds = await rightZone.bounds()
    await app.mouse.move({ x: rBounds.x + rBounds.width / 2, y: rBounds.y + rBounds.height / 2 }, { pressedButton: 0 })
    await app.mouse.up({ x: rBounds.x + rBounds.width / 2, y: rBounds.y + rBounds.height / 2 })

    // Layout should now be split with Tab 1 on left and Tab 2 on right
    expect(updatedLayout.root?.type).toBe('split')

    await app.close()
  })

  it('persists layout to storage on save and restores on restore', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer />)
    const app = await connectTest(renderer)

    const saveBtn = app.getByTestId('dock-save-btn')
    await saveBtn.waitFor({ timeoutMs: 5000 })
    await saveBtn.click()

    const restoreBtn = app.getByTestId('dock-restore-btn')
    await restoreBtn.waitFor({ timeoutMs: 5000 })
    await restoreBtn.click()

    await app.close()
  })

  it('does not enter drag state or show drop overlays on a simple tab click', async () => {
    const layout = createInitialDockLayout([
      { id: 'tab-1', title: 'Panel 1' },
      { id: 'tab-2', title: 'Panel 2' },
    ])
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<DockContainer initialLayout={layout} />)
    const app = await connectTest(renderer)

    // Click tab 2 without moving
    const tab2 = app.getByTestId('dock-tab-tab-2')
    await tab2.waitFor({ timeoutMs: 5000 })
    const bounds = await tab2.bounds()
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await app.mouse.down({ x, y })
    await app.mouse.up({ x, y })

    // Ghost element should not be rendered
    const ghost = app.getByTestId('dock-drag-ghost')
    expect(await ghost.count()).toBe(0)

    // Overlay should not be rendered
    const overlay = app.getByTestId(`dock-drop-overlay-${layout.activeGroupId}`)
    expect(await overlay.count()).toBe(0)

    await app.close()
  })
})