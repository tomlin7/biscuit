import type { WorkspaceFileEntry } from './types'

export const IGNORED_NAMES = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '.DS_Store',
  'Thumbs.db',
  '.turbo',
  'dist',
  'target',
])

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function joinPath(base: string, child: string): string {
  const normBase = normalizePath(base)
  const normChild = child.replace(/^[\/\\]+/, '').replace(/[\/\\]+$/, '')
  return normBase ? `${normBase}/${normChild}` : normChild
}

export function getFileExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf('.')
  if (dotIdx <= 0 || dotIdx === filename.length - 1) return ''
  return filename.slice(dotIdx + 1).toLowerCase()
}

export function shouldSkipName(name: string): boolean {
  return IGNORED_NAMES.has(name)
}

export function sortEntries(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

/**
 * Scan a directory from disk using node:fs/promises if available.
 * If running in a mock/browser environment where node:fs is not present, returns empty or mock entries.
 */
export async function scanDirectory(
  dirPath: string,
  virtualMockMap?: Record<string, WorkspaceFileEntry[]>
): Promise<WorkspaceFileEntry[]> {
  const normalized = normalizePath(dirPath)

  if (virtualMockMap && virtualMockMap[normalized]) {
    return sortEntries(virtualMockMap[normalized])
  }

  try {
    const fs = await import('node:fs/promises')
    const rawEntries = await fs.readdir(normalized, { withFileTypes: true })
    const results: WorkspaceFileEntry[] = []

    for (const entry of rawEntries) {
      if (shouldSkipName(entry.name)) continue

      const isDir = entry.isDirectory()
      const childPath = joinPath(normalized, entry.name)

      results.push({
        path: childPath,
        name: entry.name,
        kind: isDir ? 'directory' : 'file',
        extension: isDir ? undefined : getFileExtension(entry.name),
        children: isDir ? [] : undefined,
        loaded: false,
      })
    }

    return sortEntries(results)
  } catch (err) {
    return []
  }
}

/**
 * Immutably update a tree node when a sub-directory is expanded/loaded.
 */
export function updateTreeNode(
  nodes: WorkspaceFileEntry[],
  targetPath: string,
  children: WorkspaceFileEntry[]
): WorkspaceFileEntry[] {
  const normTarget = normalizePath(targetPath)

  return nodes.map((node) => {
    if (normalizePath(node.path) === normTarget) {
      return {
        ...node,
        children: sortEntries(children),
        loaded: true,
      }
    }

    if (node.kind === 'directory' && node.children && normTarget.startsWith(normalizePath(node.path) + '/')) {
      return {
        ...node,
        children: updateTreeNode(node.children, normTarget, children),
      }
    }

    return node
  })
}

/**
 * Immutably insert a new file/folder entry into the tree hierarchy.
 */
export function insertEntryIntoTree(
  nodes: WorkspaceFileEntry[],
  parentPath: string,
  newEntry: WorkspaceFileEntry
): WorkspaceFileEntry[] {
  const normParent = normalizePath(parentPath)

  if (!normParent || normParent === '.' || normParent === '') {
    return sortEntries([...nodes, newEntry])
  }

  return nodes.map((node) => {
    if (normalizePath(node.path) === normParent) {
      const existing = node.children ?? []
      const filtered = existing.filter((c) => c.name !== newEntry.name)
      return {
        ...node,
        children: sortEntries([...filtered, newEntry]),
        loaded: true,
      }
    }

    if (node.kind === 'directory' && node.children && normParent.startsWith(normalizePath(node.path) + '/')) {
      return {
        ...node,
        children: insertEntryIntoTree(node.children, normParent, newEntry),
      }
    }

    return node
  })
}

/**
 * Immutably remove an entry from the tree hierarchy.
 */
export function removeEntryFromTree(
  nodes: WorkspaceFileEntry[],
  targetPath: string
): WorkspaceFileEntry[] {
  const normTarget = normalizePath(targetPath)

  return nodes
    .filter((node) => normalizePath(node.path) !== normTarget)
    .map((node) => {
      if (node.kind === 'directory' && node.children) {
        return {
          ...node,
          children: removeEntryFromTree(node.children, normTarget),
        }
      }
      return node
    })
}
