import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { CommandPalette } from './CommandPalette'
import type { CommandItem, QuickOpenFileItem } from './types'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

describeNative('CommandPalette & Quick Open Component', () => {
  const dummyCommands: CommandItem[] = [
    {
      id: 'test.save',
      title: 'Save Buffer',
      category: 'File',
      shortcut: 'Ctrl+S',
      run: vi.fn(),
    },
    {
      id: 'test.quickOpen',
      title: 'Quick Open',
      category: 'File',
      shortcut: 'Ctrl+P',
      run: vi.fn(),
    },
    {
      id: 'test.split',
      title: 'Split Down',
      category: 'View',
      run: vi.fn(),
    },
  ]

  const dummyFiles: QuickOpenFileItem[] = [
    {
      path: 'E:/biscuit/T3D/gpuix/src/editor/syntax.ts',
      name: 'syntax.ts',
      relativePath: 'src/editor/syntax.ts',
    },
    {
      path: 'E:/biscuit/T3D/gpuix/src/commands/fuzzy.ts',
      name: 'fuzzy.ts',
      relativePath: 'src/commands/fuzzy.ts',
    },
  ]

  it('does not render dialog when open is false', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <CommandPalette
        open={false}
        onClose={vi.fn()}
        commands={dummyCommands}
      />
    )
    const app = await connectTest(renderer)

    const overlay = app.getByTestId('command-palette-overlay')
    expect(await overlay.count()).toBe(0)

    await app.close()
  })

  it('renders command palette with search input and command list', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <CommandPalette
        open={true}
        onClose={vi.fn()}
        mode="commands"
        commands={dummyCommands}
      />
    )
    const app = await connectTest(renderer)

    const input = app.getByTestId('command-palette-input')
    await input.waitFor({ timeoutMs: 5_000 })
    expect(await input.bounds()).toBeDefined()

    const itemSave = app.getByTestId('command-palette-item-test.save')
    await itemSave.waitFor({ timeoutMs: 5_000 })
    expect(await itemSave.bounds()).toBeDefined()

    const text = renderer.getPaintedText()
    expect(text).toContain('Save Buffer')
    expect(text).toContain('Ctrl+S')
    expect(text).toContain('Quick Open')

    await app.close()
  })

  it('executes command and closes on item click', async () => {
    const handleClose = vi.fn()
    const handleRun = vi.fn()
    const cmdList: CommandItem[] = [
      {
        id: 'test.runme',
        title: 'Run Action',
        category: 'Action',
        run: handleRun,
      },
    ]

    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <CommandPalette
        open={true}
        onClose={handleClose}
        mode="commands"
        commands={cmdList}
      />
    )
    const app = await connectTest(renderer)

    const item = app.getByTestId('command-palette-item-test.runme')
    await item.waitFor({ timeoutMs: 5_000 })
    await item.click()

    expect(handleRun).toHaveBeenCalledTimes(1)
    expect(handleClose).toHaveBeenCalledTimes(1)

    await app.close()
  })

  it('renders quick open file list and triggers onSelectFile', async () => {
    const handleClose = vi.fn()
    const handleSelectFile = vi.fn()

    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <CommandPalette
        open={true}
        onClose={handleClose}
        mode="files"
        files={dummyFiles}
        onSelectFile={handleSelectFile}
      />
    )
    const app = await connectTest(renderer)

    const item0 = app.getByTestId('quick-open-item-0')
    await item0.waitFor({ timeoutMs: 5_000 })
    expect(await item0.bounds()).toBeDefined()

    const text = renderer.getPaintedText()
    expect(text).toContain('syntax.ts')
    expect(text).toContain('fuzzy.ts')

    await item0.click()
    expect(handleSelectFile).toHaveBeenCalledWith(dummyFiles[0])
    expect(handleClose).toHaveBeenCalledTimes(1)

    await app.close()
  })

  it('calls onClose when clicking backdrop', async () => {
    const handleClose = vi.fn()

    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <CommandPalette
        open={true}
        onClose={handleClose}
        commands={dummyCommands}
      />
    )
    const app = await connectTest(renderer)

    const backdrop = app.getByTestId('command-palette-backdrop')
    await backdrop.waitFor({ timeoutMs: 5_000 })
    await backdrop.click()

    expect(handleClose).toHaveBeenCalledTimes(1)

    await app.close()
  })
})
