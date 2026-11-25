import type { CommandItem } from './types'

export interface CommandContext {
  openFile?: (path: string, name?: string) => void
  saveActiveBuffer?: () => void
  createUntitledFile?: () => void
  splitEditorRight?: () => void
  splitEditorDown?: () => void
  closeActivePanel?: () => void
  newTab?: () => void
  toggleExplorer?: () => void
  openQuickOpen?: () => void
  openCommandPalette?: () => void
  openSettings?: () => void
  toggleMaximize?: () => void
}

/**
 * Flattens recursive workspace file tree into a flat list of file items for Quick Open.
 */
export function flattenWorkspaceFiles(
  entries: { path: string; name: string; kind?: string; isDirectory?: boolean; children?: any[] }[],
  rootPath: string = ''
): import('./types').QuickOpenFileItem[] {
  const result: import('./types').QuickOpenFileItem[] = []
  function walk(items: typeof entries) {
    for (const item of items) {
      const isDir = item.kind === 'directory' || item.isDirectory === true
      if (!isDir) {
        const rel = rootPath && item.path.startsWith(rootPath)
          ? item.path.slice(rootPath.length).replace(/^[/\\]/, '')
          : item.path
        result.push({
          path: item.path,
          name: item.name,
          relativePath: rel,
          isDirectory: false,
        })
      }
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children)
      }
    }
  }
  walk(entries)
  return result
}

/**
 * Creates default shell, dock, and editor commands wired to the active shell context.
 */
export function createDefaultCommands(ctx: CommandContext): CommandItem[] {
  return [
    {
      id: 'workbench.action.quickOpen',
      title: 'Quick Open File',
      category: 'File',
      shortcut: 'Ctrl+P',
      description: 'Quickly find and open a file in the workspace',
      run: () => ctx.openQuickOpen?.(),
    },
    {
      id: 'workbench.action.showCommands',
      title: 'Command Palette',
      category: 'View',
      shortcut: 'Ctrl+Shift+P',
      description: 'Search and run shell and editor commands',
      run: () => ctx.openCommandPalette?.(),
    },
    {
      id: 'workbench.action.files.save',
      title: 'Save Active Buffer',
      category: 'File',
      shortcut: 'Ctrl+S',
      description: 'Save the currently active editor buffer to disk',
      run: () => ctx.saveActiveBuffer?.(),
    },
    {
      id: 'workbench.action.files.newUntitledFile',
      title: 'New Untitled File',
      category: 'File',
      shortcut: 'Ctrl+N',
      description: 'Create a new untitled editor buffer',
      run: () => ctx.createUntitledFile?.(),
    },
    {
      id: 'workbench.action.view.toggleExplorer',
      title: 'Focus or Open Explorer',
      category: 'View',
      shortcut: 'Ctrl+Shift+E',
      description: 'Dock or focus the workspace file tree explorer',
      run: () => ctx.toggleExplorer?.(),
    },
    {
      id: 'workbench.action.splitEditorRight',
      title: 'Split Editor Right',
      category: 'View',
      shortcut: 'Ctrl+\\',
      description: 'Split the active dock group horizontally to the right',
      run: () => ctx.splitEditorRight?.(),
    },
    {
      id: 'workbench.action.splitEditorDown',
      title: 'Split Editor Down',
      category: 'View',
      description: 'Split the active dock group vertically downward',
      run: () => ctx.splitEditorDown?.(),
    },
    {
      id: 'workbench.action.newTab',
      title: 'New Tab',
      category: 'View',
      shortcut: 'Ctrl+T',
      description: 'Add a new tab to the active dock group',
      run: () => ctx.newTab?.(),
    },
    {
      id: 'workbench.action.closeActiveEditor',
      title: 'Close Active Panel',
      category: 'View',
      shortcut: 'Ctrl+W',
      description: 'Close the currently focused panel in the dock',
      run: () => ctx.closeActivePanel?.(),
    },
    {
      id: 'workbench.action.openSettings',
      title: 'Open Settings',
      category: 'Preferences',
      shortcut: 'Ctrl+,',
      description: 'Open the preferences and settings dock panel',
      run: () => ctx.openSettings?.(),
    },
    {
      id: 'workbench.action.toggleMaximize',
      title: 'Toggle Window Maximize',
      category: 'Window',
      shortcut: 'F11',
      description: 'Toggle window maximized state',
      run: () => ctx.toggleMaximize?.(),
    },
  ]
}
