import React from 'react'
import { describe, expect, it } from 'vitest'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { connectTest } from '@gpuix/react/automation'
import { EditorWorkspace } from './EditorWorkspace'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

describeNative('EditorWorkspace component', () => {
  it('renders open editor tabs and status bar', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<EditorWorkspace />)
    const app = await connectTest(renderer)

    const workspace = app.getByTestId('morsel-editor-workspace')
    await workspace.waitFor({ timeoutMs: 10_000 })
    expect(await workspace.bounds()).toBeDefined()

    const tab1 = app.getByTestId('editor-tab-tab-1')
    await tab1.waitFor({ timeoutMs: 5000 })
    expect(await tab1.bounds()).toBeDefined()

    const statusBar = app.getByTestId('morsel-status-bar')
    await statusBar.waitFor({ timeoutMs: 5000 })
    expect(await statusBar.bounds()).toBeDefined()

    await app.close()
  })

  it('allows creating a new buffer and saving it', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<EditorWorkspace />)
    const app = await connectTest(renderer)

    const newTabBtn = app.getByTestId('editor-new-tab')
    await newTabBtn.waitFor({ timeoutMs: 5000 })
    await newTabBtn.click()

    const saveBtn = app.getByTestId('editor-save-button')
    await saveBtn.waitFor({ timeoutMs: 5000 })
    await saveBtn.click()

    const breadcrumb = app.getByTestId('editor-breadcrumb-bar')
    expect(await breadcrumb.bounds()).toBeDefined()

    await app.close()
  })

  it('closes a tab when close button is clicked', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<EditorWorkspace />)
    const app = await connectTest(renderer)

    const closeTab1 = app.getByTestId('close-tab-tab-1')
    await closeTab1.waitFor({ timeoutMs: 5000 })
    await closeTab1.click()

    const tab2 = app.getByTestId('editor-tab-tab-2')
    await tab2.waitFor({ timeoutMs: 5000 })
    expect(await tab2.bounds()).toBeDefined()

    await app.close()
  })

  it('supports toggling edit buffer mode and interactive editing', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<EditorWorkspace />)
    const app = await connectTest(renderer)

    const toggleBtn = app.getByTestId('editor-mode-toggle')
    await toggleBtn.waitFor({ timeoutMs: 5000 })
    await toggleBtn.click()

    const textarea = app.getByTestId('editor-interactive-textarea')
    await textarea.waitFor({ timeoutMs: 5000 })
    expect(await textarea.bounds()).toBeDefined()

    // Switch back to syntax view
    await toggleBtn.click()
    const codeView = app.getByTestId('editor-code-view')
    await codeView.waitFor({ timeoutMs: 5000 })
    expect(await codeView.bounds()).toBeDefined()

    await app.close()
  })

  it('opens quick open bar and loads file path', async () => {
    const { render, renderer } = createTestRoot({ width: 1000, height: 700 })
    render(<EditorWorkspace />)
    const app = await connectTest(renderer)

    const quickOpenBtn = app.getByTestId('editor-quick-open-btn')
    await quickOpenBtn.waitFor({ timeoutMs: 5000 })
    await quickOpenBtn.click()

    const quickOpenBar = app.getByTestId('editor-quick-open-bar')
    await quickOpenBar.waitFor({ timeoutMs: 5000 })
    expect(await quickOpenBar.bounds()).toBeDefined()

    const quickOpenCancel = app.getByTestId('editor-quick-open-cancel')
    await quickOpenCancel.waitFor({ timeoutMs: 5000 })
    await quickOpenCancel.click()

    await app.close()
  })
})
