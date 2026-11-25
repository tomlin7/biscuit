import React from 'react'
import { describe, expect, it } from 'vitest'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { connectTest } from '@gpuix/react/automation'
import { WorkspaceProvider } from './WorkspaceContext'
import { FileTreeExplorer } from './FileTreeExplorer'
import type { WorkspaceFileEntry } from './types'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

const MOCK_ENTRIES: WorkspaceFileEntry[] = [
  {
    path: 'test-project/src',
    name: 'src',
    kind: 'directory',
    loaded: true,
    children: [
      {
        path: 'test-project/src/app.tsx',
        name: 'app.tsx',
        kind: 'file',
        extension: 'tsx',
      },
      {
        path: 'test-project/src/index.ts',
        name: 'index.ts',
        kind: 'file',
        extension: 'ts',
      },
    ],
  },
  {
    path: 'test-project/package.json',
    name: 'package.json',
    kind: 'file',
    extension: 'json',
  },
  {
    path: 'test-project/README.md',
    name: 'README.md',
    kind: 'file',
    extension: 'md',
  },
]

describeNative('FileTreeExplorer component', () => {
  it('renders explorer header, action buttons, and top-level directory entries', async () => {
    const { render, renderer } = createTestRoot({ width: 350, height: 600 })
    render(
      <WorkspaceProvider
        initialRootPath="test-project"
        initialEntries={MOCK_ENTRIES}
      >
        <FileTreeExplorer />
      </WorkspaceProvider>
    )
    const app = await connectTest(renderer)

    const header = app.getByTestId('explorer-header')
    await header.waitFor({ timeoutMs: 5000 })
    expect(await header.bounds()).toBeDefined()

    const rootName = app.getByTestId('explorer-root-name')
    await rootName.waitFor({ timeoutMs: 5000 })
    expect(await rootName.textContent()).toContain('TEST-PROJECT')

    const newFileBtn = app.getByTestId('explorer-new-file-btn')
    await newFileBtn.waitFor({ timeoutMs: 5000 })
    expect(await newFileBtn.bounds()).toBeDefined()

    const srcFolder = app.getByTestId('explorer-item-src')
    await srcFolder.waitFor({ timeoutMs: 5000 })
    expect(await srcFolder.bounds()).toBeDefined()

    const pkgFile = app.getByTestId('explorer-item-package.json')
    await pkgFile.waitFor({ timeoutMs: 5000 })
    expect(await pkgFile.bounds()).toBeDefined()

    await app.close()
  })

  it('toggles folder expansion on click and reveals nested children', async () => {
    let openedPath = ''
    const { render, renderer } = createTestRoot({ width: 350, height: 600 })
    render(
      <WorkspaceProvider
        initialRootPath="test-project"
        initialEntries={MOCK_ENTRIES}
        onOpenFile={(path) => {
          openedPath = path
        }}
      >
        <FileTreeExplorer />
      </WorkspaceProvider>
    )
    const app = await connectTest(renderer)

    // Initially app.tsx is not visible because src is collapsed
    const appFileBefore = app.getByTestId('explorer-item-app.tsx')
    expect(await appFileBefore.count()).toBe(0)

    // Click src folder to expand it
    const srcFolder = app.getByTestId('explorer-item-src')
    await srcFolder.waitFor({ timeoutMs: 5000 })
    await srcFolder.click()

    // Now app.tsx child appears
    const appFile = app.getByTestId('explorer-item-app.tsx')
    await appFile.waitFor({ timeoutMs: 5000 })
    expect(await appFile.bounds()).toBeDefined()

    // Click app.tsx to open file
    await appFile.click()
    expect(openedPath).toBe('test-project/src/app.tsx')

    // Click src folder again to collapse it
    await srcFolder.click()
    expect(await appFile.count()).toBe(0)

    await app.close()
  })

  it('supports inline creation dialog and collapse all action', async () => {
    const { render, renderer } = createTestRoot({ width: 350, height: 600 })
    render(
      <WorkspaceProvider
        initialRootPath="test-project"
        initialEntries={MOCK_ENTRIES}
      >
        <FileTreeExplorer />
      </WorkspaceProvider>
    )
    const app = await connectTest(renderer)

    // Open src folder
    const srcFolder = app.getByTestId('explorer-item-src')
    await srcFolder.waitFor({ timeoutMs: 5000 })
    await srcFolder.click()

    const appFile = app.getByTestId('explorer-item-app.tsx')
    await appFile.waitFor({ timeoutMs: 5000 })
    expect(await appFile.count()).toBe(1)

    // Click collapse all button
    const collapseBtn = app.getByTestId('explorer-collapse-btn')
    await collapseBtn.waitFor({ timeoutMs: 5000 })
    await collapseBtn.click()

    // src is now collapsed
    expect(await appFile.count()).toBe(0)

    // Click new file button to open create dialog
    const newFileBtn = app.getByTestId('explorer-new-file-btn')
    await newFileBtn.click()

    const dialog = app.getByTestId('explorer-create-dialog')
    await dialog.waitFor({ timeoutMs: 5000 })
    expect(await dialog.bounds()).toBeDefined()

    // Click cancel button
    const cancelBtn = app.getByTestId('explorer-create-cancel')
    await cancelBtn.click()
    expect(await dialog.count()).toBe(0)

    await app.close()
  })
})
