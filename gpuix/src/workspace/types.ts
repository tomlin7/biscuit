export type FileKind = 'file' | 'directory'

export interface WorkspaceFileEntry {
  path: string
  name: string
  kind: FileKind
  size?: number
  extension?: string
  children?: WorkspaceFileEntry[]
  loaded?: boolean
}

export interface WorkspaceState {
  rootPath: string
  rootName: string
  entries: WorkspaceFileEntry[]
  selectedPath: string | null
  expandedPaths: Record<string, boolean>
  isLoading: boolean
  error: string | null
}

export interface WorkspaceContextValue extends WorkspaceState {
  openFolder: (path: string) => Promise<void>
  toggleDirectory: (path: string) => Promise<void>
  selectFile: (path: string) => void
  createFile: (parentPath: string, name: string) => Promise<void>
  createFolder: (parentPath: string, name: string) => Promise<void>
  deleteEntry: (path: string) => Promise<void>
  collapseAll: () => void
  refresh: () => Promise<void>
}
