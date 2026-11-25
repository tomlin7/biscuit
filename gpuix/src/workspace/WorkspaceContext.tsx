import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { WorkspaceContextValue, WorkspaceFileEntry } from './types'
import {
  insertEntryIntoTree,
  joinPath,
  normalizePath,
  removeEntryFromTree,
  scanDirectory,
  updateTreeNode,
} from './fsTree'

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export interface WorkspaceProviderProps {
  initialRootPath?: string
  initialEntries?: WorkspaceFileEntry[]
  virtualMockMap?: Record<string, WorkspaceFileEntry[]>
  onOpenFile?: (path: string, name: string) => void
  children: React.ReactNode
}

export function WorkspaceProvider({
  initialRootPath = 'E:/biscuit/T3D',
  initialEntries,
  virtualMockMap,
  onOpenFile,
  children,
}: WorkspaceProviderProps) {
  const [rootPath, setRootPath] = useState(normalizePath(initialRootPath))
  const [entries, setEntries] = useState<WorkspaceFileEntry[]>(initialEntries ?? [])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootName = useMemo(() => {
    const parts = rootPath.split('/')
    return parts[parts.length - 1] || 'WORKSPACE'
  }, [rootPath])

  // Initial load
  const loadRoot = useCallback(
    async (path: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const scanned = await scanDirectory(path, virtualMockMap)
        setEntries(scanned)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    },
    [virtualMockMap]
  )

  useEffect(() => {
    if (!initialEntries) {
      void loadRoot(rootPath)
    }
  }, [rootPath, initialEntries, loadRoot])

  // Open / switch workspace folder
  const openFolder = useCallback(
    async (newPath: string) => {
      const norm = normalizePath(newPath)
      setRootPath(norm)
      setExpandedPaths({})
      setSelectedPath(null)
      await loadRoot(norm)
    },
    [loadRoot]
  )

  // Toggle directory expansion and lazily scan children if needed
  const toggleDirectory = useCallback(
    async (dirPath: string) => {
      const norm = normalizePath(dirPath)
      const isCurrentlyExpanded = !!expandedPaths[norm]

      if (isCurrentlyExpanded) {
        setExpandedPaths((prev) => ({ ...prev, [norm]: false }))
        return
      }

      setExpandedPaths((prev) => ({ ...prev, [norm]: true }))

      // Check if children need to be loaded
      const findNode = (list: WorkspaceFileEntry[]): WorkspaceFileEntry | null => {
        for (const item of list) {
          if (normalizePath(item.path) === norm) return item
          if (item.children) {
            const found = findNode(item.children)
            if (found) return found
          }
        }
        return null
      }

      const node = findNode(entries)
      if (node && !node.loaded) {
        try {
          const children = await scanDirectory(norm, virtualMockMap)
          setEntries((prev) => updateTreeNode(prev, norm, children))
        } catch {
          // Keep empty if unreadable
        }
      }
    },
    [expandedPaths, entries, virtualMockMap]
  )

  const selectFile = useCallback(
    (filePath: string) => {
      setSelectedPath(filePath)
      const name = filePath.split('/').pop() ?? filePath
      onOpenFile?.(filePath, name)
    },
    [onOpenFile]
  )

  const collapseAll = useCallback(() => {
    setExpandedPaths({})
  }, [])

  const refresh = useCallback(async () => {
    await loadRoot(rootPath)
  }, [loadRoot, rootPath])

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      const targetParent = parentPath ? normalizePath(parentPath) : rootPath
      const newPath = joinPath(targetParent, name)
      const newEntry: WorkspaceFileEntry = {
        path: newPath,
        name,
        kind: 'file',
        extension: name.split('.').pop() ?? '',
      }

      // Try write to disk if node:fs available
      try {
        const fs = await import('node:fs/promises')
        await fs.writeFile(newPath, '', { flag: 'wx' })
      } catch {
        // Continue for virtual / test environments
      }

      setEntries((prev) => insertEntryIntoTree(prev, targetParent, newEntry))
      setSelectedPath(newPath)
      onOpenFile?.(newPath, name)
    },
    [rootPath, onOpenFile]
  )

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      const targetParent = parentPath ? normalizePath(parentPath) : rootPath
      const newPath = joinPath(targetParent, name)
      const newEntry: WorkspaceFileEntry = {
        path: newPath,
        name,
        kind: 'directory',
        children: [],
        loaded: true,
      }

      try {
        const fs = await import('node:fs/promises')
        await fs.mkdir(newPath, { recursive: true })
      } catch {
        // Continue for virtual / test environments
      }

      setEntries((prev) => insertEntryIntoTree(prev, targetParent, newEntry))
      setExpandedPaths((prev) => ({ ...prev, [newPath]: true }))
    },
    [rootPath]
  )

  const deleteEntry = useCallback(
    async (targetPath: string) => {
      const norm = normalizePath(targetPath)
      try {
        const fs = await import('node:fs/promises')
        await fs.rm(norm, { recursive: true, force: true })
      } catch {
        // Continue for virtual / test environments
      }

      setEntries((prev) => removeEntryFromTree(prev, norm))
      if (selectedPath === norm) {
        setSelectedPath(null)
      }
    },
    [selectedPath]
  )

  const value: WorkspaceContextValue = useMemo(
    () => ({
      rootPath,
      rootName,
      entries,
      selectedPath,
      expandedPaths,
      isLoading,
      error,
      openFolder,
      toggleDirectory,
      selectFile,
      createFile,
      createFolder,
      deleteEntry,
      collapseAll,
      refresh,
    }),
    [
      rootPath,
      rootName,
      entries,
      selectedPath,
      expandedPaths,
      isLoading,
      error,
      openFolder,
      toggleDirectory,
      selectFile,
      createFile,
      createFolder,
      deleteEntry,
      collapseAll,
      refresh,
    ]
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return ctx
}
