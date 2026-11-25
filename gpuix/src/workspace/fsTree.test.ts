import { describe, expect, it } from 'vitest'
import {
  normalizePath,
  joinPath,
  getFileExtension,
  shouldSkipName,
  sortEntries,
  updateTreeNode,
  insertEntryIntoTree,
  removeEntryFromTree,
} from './fsTree'
import type { WorkspaceFileEntry } from './types'

describe('fsTree utilities', () => {
  it('normalizes paths consistently across platforms', () => {
    expect(normalizePath('C:\\project\\src\\app.tsx')).toBe('C:/project/src/app.tsx')
    expect(normalizePath('folder/subfolder/')).toBe('folder/subfolder')
    expect(normalizePath('/root/path///')).toBe('/root/path')
  })

  it('joins paths cleanly without duplicate slashes', () => {
    expect(joinPath('src', 'app.tsx')).toBe('src/app.tsx')
    expect(joinPath('src/', '/app.tsx')).toBe('src/app.tsx')
    expect(joinPath('', 'file.txt')).toBe('file.txt')
  })

  it('extracts file extensions accurately', () => {
    expect(getFileExtension('app.tsx')).toBe('tsx')
    expect(getFileExtension('index.test.ts')).toBe('ts')
    expect(getFileExtension('Dockerfile')).toBe('')
    expect(getFileExtension('.gitignore')).toBe('')
  })

  it('identifies ignored folders and files', () => {
    expect(shouldSkipName('node_modules')).toBe(true)
    expect(shouldSkipName('.git')).toBe(true)
    expect(shouldSkipName('.DS_Store')).toBe(true)
    expect(shouldSkipName('src')).toBe(false)
    expect(shouldSkipName('app.tsx')).toBe(false)
  })

  it('sorts directories first, then files alphabetically', () => {
    const raw: WorkspaceFileEntry[] = [
      { path: 'src/main.ts', name: 'main.ts', kind: 'file' },
      { path: 'src/components', name: 'components', kind: 'directory' },
      { path: 'src/assets', name: 'assets', kind: 'directory' },
      { path: 'src/index.ts', name: 'index.ts', kind: 'file' },
    ]
    const sorted = sortEntries(raw)
    expect(sorted.map((e) => e.name)).toEqual([
      'assets',
      'components',
      'index.ts',
      'main.ts',
    ])
  })

  it('updates a nested directory with loaded children', () => {
    const root: WorkspaceFileEntry[] = [
      {
        path: 'src',
        name: 'src',
        kind: 'directory',
        children: [],
        loaded: false,
      },
    ]

    const updated = updateTreeNode(root, 'src', [
      { path: 'src/app.tsx', name: 'app.tsx', kind: 'file' },
    ])

    expect(updated[0].loaded).toBe(true)
    expect(updated[0].children?.[0].name).toBe('app.tsx')
  })

  it('inserts and removes tree entries immutably', () => {
    const root: WorkspaceFileEntry[] = [
      {
        path: 'src',
        name: 'src',
        kind: 'directory',
        children: [{ path: 'src/app.tsx', name: 'app.tsx', kind: 'file' }],
      },
    ]

    // Insert new file
    const withNewFile = insertEntryIntoTree(root, 'src', {
      path: 'src/util.ts',
      name: 'util.ts',
      kind: 'file',
    })
    expect(withNewFile[0].children?.length).toBe(2)
    expect(withNewFile[0].children?.[1].name).toBe('util.ts')

    // Remove file
    const removed = removeEntryFromTree(withNewFile, 'src/app.tsx')
    expect(removed[0].children?.length).toBe(1)
    expect(removed[0].children?.[0].name).toBe('util.ts')
  })
})
