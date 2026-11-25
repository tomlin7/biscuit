import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { StatusBar } from './StatusBar'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

describeNative('StatusBar Component', () => {
  it('renders default status bar with git branch, encoding, and line endings', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 100 })
    render(<StatusBar branch="main" />)
    const app = await connectTest(renderer)

    const statusBar = app.getByTestId('bottom-status-bar')
    await statusBar.waitFor({ timeoutMs: 5_000 })
    expect(await statusBar.bounds()).toBeDefined()

    const branch = app.getByTestId('status-git-branch')
    await branch.waitFor({ timeoutMs: 5_000 })
    expect(await branch.bounds()).toBeDefined()

    const text = renderer.getPaintedText()
    expect(text).toContain('main')
    expect(text).toContain('UTF-8')
    expect(text).toContain('LF')
    expect(text).toContain('Spaces: 2')

    await app.close()
  })

  it('renders cursor metrics, diagnostics, and language badge when provided', async () => {
    const handleLineColClick = vi.fn()
    const handleLanguageClick = vi.fn()

    const { render, renderer } = createTestRoot({ width: 800, height: 100 })
    render(
      <StatusBar
        branch="feat/editor"
        workspaceName="T3D"
        cursorLine={42}
        cursorCol={12}
        language="typescript"
        errorCount={2}
        warningCount={5}
        onLineColClick={handleLineColClick}
        onLanguageClick={handleLanguageClick}
      />
    )
    const app = await connectTest(renderer)

    const metrics = app.getByTestId('status-cursor-metrics')
    await metrics.waitFor({ timeoutMs: 5_000 })
    expect(await metrics.bounds()).toBeDefined()

    const lang = app.getByTestId('status-language')
    await lang.waitFor({ timeoutMs: 5_000 })
    expect(await lang.bounds()).toBeDefined()

    const text = renderer.getPaintedText()
    expect(text).toContain('Ln 42, Col 12')
    expect(text).toContain('Typescript')
    expect(text).toContain('T3D')

    await metrics.click()
    expect(handleLineColClick).toHaveBeenCalledTimes(1)

    await lang.click()
    expect(handleLanguageClick).toHaveBeenCalledTimes(1)

    await app.close()
  })
})
