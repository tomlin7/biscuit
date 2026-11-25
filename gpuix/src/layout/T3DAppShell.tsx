import React, { useCallback, useMemo, useState } from 'react'
import { Button, useGpuix } from '@gpuix/react'
import {
  handleTitlebarMouseDown,
  isWindowMaximized,
  toggleWindowZoom,
  endWindowDrag,
} from '../window-drag'
import {
  DockContainer,
  createEmptyDockLayout,
  addPanelToGroup,
  generateDockId,
  setActivePanel,
  findGroupContainingPanel,
  getAllGroups,
  splitGroup,
  closePanel,
  type DockLayoutState,
  type DockPanel,
  type DockPanelGroupNode,
  type DockSplitNode,
} from '../dock'
import { WorkspaceProvider, FileTreeExplorer, useWorkspace } from '../workspace'
import { EditorProvider, EditorBufferView, useEditor } from '../editor'
import {
  CommandPalette,
  createDefaultCommands,
  flattenWorkspaceFiles,
  type PaletteMode,
} from '../commands'

export interface T3DAppShellProps {
  initialLayout?: DockLayoutState
  initialRootPath?: string
  virtualFileMap?: Record<string, string>
}

/**
 * Starter layout with the File Tree Explorer docked to the left
 * and an editor/welcome surface on the right.
 */
export function createT3DStarterLayout(): DockLayoutState {
  const explorerGroupId = generateDockId('group')
  const mainGroupId = generateDockId('group')

  const explorerGroup: DockPanelGroupNode = {
    id: explorerGroupId,
    type: 'group',
    panels: [
      { id: 'panel-explorer', title: 'Explorer', closable: false },
    ],
    activePanelId: 'panel-explorer',
  }

  const mainGroup: DockPanelGroupNode = {
    id: mainGroupId,
    type: 'group',
    panels: [
      { id: 'panel-welcome', title: 'Welcome', closable: true },
    ],
    activePanelId: 'panel-welcome',
  }

  const rootSplit: DockSplitNode = {
    id: generateDockId('split'),
    type: 'split',
    direction: 'horizontal',
    ratio: 0.22,
    first: explorerGroup,
    second: mainGroup,
  }

  return {
    root: rootSplit,
    activeGroupId: mainGroupId,
  }
}

export function T3DAppShell({ initialLayout, initialRootPath, virtualFileMap }: T3DAppShellProps) {
  return (
    <EditorProvider virtualFileMap={virtualFileMap}>
      <WorkspaceProvider initialRootPath={initialRootPath}>
        <T3DAppShellWorkspaceContent initialLayout={initialLayout} />
      </WorkspaceProvider>
    </EditorProvider>
  )
}

function T3DAppShellWorkspaceContent({
  initialLayout,
}: {
  initialLayout?: DockLayoutState
}) {
  const { renderer } = useGpuix()
  const isDarwin = typeof process !== 'undefined' && process.platform === 'darwin'
  const [maximized, setMaximized] = useState(false)
  const { openFile, activeBufferId, saveBuffer, createUntitledBuffer } = useEditor()
  const { entries, rootPath } = useWorkspace()

  // Default to clean empty layout if no initialLayout is passed
  const [shellLayout, setShellLayout] = useState<DockLayoutState>(() => {
    return initialLayout ?? createEmptyDockLayout()
  })

  // Command palette & Quick Open state
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('commands')

  const handleOpenQuickOpen = useCallback(() => {
    setPaletteMode('files')
    setPaletteOpen(true)
  }, [])

  const handleOpenCommandPalette = useCallback(() => {
    setPaletteMode('commands')
    setPaletteOpen(true)
  }, [])

  // Open a file from explorer/quick open into a dock editor tab
  const handleOpenFile = useCallback(
    (path: string, name?: string) => {
      const panelId = `file-${path}`
      void openFile(path)

      const title = name ?? path.split('/').pop()?.split('\\').pop() ?? path

      setShellLayout((prev) => {
        // If already open in any group, just focus it
        const existing = findGroupContainingPanel(prev.root, panelId)
        if (existing) {
          return setActivePanel(prev, existing.id, panelId)
        }

        const allGroups = getAllGroups(prev.root)
        // Pick active group or the first non-explorer group
        const target =
          allGroups.find((g) => g.id === prev.activeGroupId && !g.panels.some((p) => p.id === 'panel-explorer')) ??
          allGroups.find((g) => !g.panels.some((p) => p.id === 'panel-explorer')) ??
          allGroups[0]

        if (!target) return prev

        const newPanel: DockPanel = {
          id: panelId,
          title,
          closable: true,
        }

        return addPanelToGroup(prev, target.id, newPanel)
      })
    },
    [openFile]
  )

  // Add an Explorer panel to a group
  const handleAddExplorerTab = useCallback((groupId: string) => {
    setShellLayout((prev) => {
      const existing = findGroupContainingPanel(prev.root, 'panel-explorer')
      if (existing) {
        return setActivePanel(prev, existing.id, 'panel-explorer')
      }

      const newPanel: DockPanel = {
        id: 'panel-explorer',
        title: 'Explorer',
        closable: false,
      }

      return addPanelToGroup(prev, groupId, newPanel)
    })
  }, [])

  // Add a generic new tab
  const handleAddTab = useCallback((groupId: string) => {
    const newPanel: DockPanel = {
      id: generateDockId('panel'),
      title: 'New Tab',
      closable: true,
    }
    setShellLayout((prev) => addPanelToGroup(prev, groupId, newPanel))
  }, [])

  // Shell & Editor Actions for Command Palette
  const handleSplitEditorRight = useCallback(() => {
    setShellLayout((prev) => {
      const activeGroupId = prev.activeGroupId
      if (!activeGroupId) return prev
      const newPanel: DockPanel = {
        id: generateDockId('panel'),
        title: 'New Tab',
        closable: true,
      }
      return splitGroup(prev, activeGroupId, newPanel, 'horizontal', 'second', 0.5)
    })
  }, [])

  const handleSplitEditorDown = useCallback(() => {
    setShellLayout((prev) => {
      const activeGroupId = prev.activeGroupId
      if (!activeGroupId) return prev
      const newPanel: DockPanel = {
        id: generateDockId('panel'),
        title: 'New Tab',
        closable: true,
      }
      return splitGroup(prev, activeGroupId, newPanel, 'vertical', 'second', 0.5)
    })
  }, [])

  const handleCloseActivePanel = useCallback(() => {
    setShellLayout((prev) => {
      const all = getAllGroups(prev.root)
      const group = all.find((g) => g.id === prev.activeGroupId) ?? all[0]
      if (!group || !group.activePanelId) return prev
      return closePanel(prev, group.activePanelId)
    })
  }, [])

  const handleSaveActiveBuffer = useCallback(() => {
    if (activeBufferId) {
      void saveBuffer(activeBufferId)
    }
  }, [activeBufferId, saveBuffer])

  const handleCreateUntitledFile = useCallback(() => {
    const buf = createUntitledBuffer()
    handleOpenFile(buf.path, buf.title)
  }, [createUntitledBuffer, handleOpenFile])

  const handleToggleExplorer = useCallback(() => {
    setShellLayout((prev) => {
      const existing = findGroupContainingPanel(prev.root, 'panel-explorer')
      if (existing) {
        return setActivePanel(prev, existing.id, 'panel-explorer')
      }
      const all = getAllGroups(prev.root)
      if (all.length === 0) return prev
      const target = all[0]
      const newPanel: DockPanel = {
        id: 'panel-explorer',
        title: 'Explorer',
        closable: false,
      }
      return addPanelToGroup(prev, target.id, newPanel)
    })
  }, [])

  // Registered commands for Command Palette
  const commands = useMemo(() => {
    return createDefaultCommands({
      openFile: handleOpenFile,
      saveActiveBuffer: handleSaveActiveBuffer,
      createUntitledFile: handleCreateUntitledFile,
      splitEditorRight: handleSplitEditorRight,
      splitEditorDown: handleSplitEditorDown,
      closeActivePanel: handleCloseActivePanel,
      newTab: () => {
        if (shellLayout.activeGroupId) {
          handleAddTab(shellLayout.activeGroupId)
        }
      },
      toggleExplorer: handleToggleExplorer,
      openQuickOpen: handleOpenQuickOpen,
      openCommandPalette: handleOpenCommandPalette,
      toggleMaximize: () => {
        if (renderer) {
          toggleWindowZoom(renderer)
          setMaximized(isWindowMaximized())
        }
      },
    })
  }, [
    handleOpenFile,
    handleSaveActiveBuffer,
    handleCreateUntitledFile,
    handleSplitEditorRight,
    handleSplitEditorDown,
    handleCloseActivePanel,
    handleAddTab,
    handleToggleExplorer,
    handleOpenQuickOpen,
    handleOpenCommandPalette,
    renderer,
    shellLayout.activeGroupId,
  ])

  // Flatten workspace directory entries for Quick Open file search
  const quickOpenFiles = useMemo(() => {
    return flattenWorkspaceFiles(entries, rootPath)
  }, [entries, rootPath])

  // Global keydown handler on app container
  const handleGlobalKeyDown = useCallback(
    (e: any) => {
      // Ctrl+Shift+P / Cmd+Shift+P -> Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P') && e.shiftKey) {
        e.preventDefault?.()
        e.stopPropagation?.()
        handleOpenCommandPalette()
      }
      // Ctrl+P / Cmd+P -> Quick Open
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault?.()
        e.stopPropagation?.()
        handleOpenQuickOpen()
      }
    },
    [handleOpenCommandPalette, handleOpenQuickOpen]
  )

  // Panel content renderer
  const renderPanel = useCallback(
    (panel: DockPanel, group: DockPanelGroupNode) => {
      // 1. File Tree Explorer panel
      if (panel.id === 'panel-explorer' || panel.title.toLowerCase() === 'explorer') {
        return <FileTreeExplorer onOpenFile={handleOpenFile} />
      }

      // 2. Open file editor surface
      if (panel.id.startsWith('file-')) {
        const filePath = panel.id.slice(5)
        return (
          <div
            testId={`dock-panel-file-${panel.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              width: '100%',
              height: '100%',
              backgroundColor: '#18181b',
              overflow: 'hidden',
            }}
          >
            <EditorBufferView bufferId={panel.id} path={filePath} />
          </div>
        )
      }

      // 3. Welcome or general panel
      return (
        <div
          testId={`dock-panel-view-${panel.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: '100%',
            height: '100%',
            backgroundColor: '#18181b',
            padding: 16,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderColor: '#27272a',
              marginBottom: 12,
            }}
          >
            <text style={{ fontSize: 13, fontWeight: 'bold', color: '#f4f4f5' }}>
              {panel.title}
            </text>
            <text style={{ fontSize: 11, color: '#71717a' }}>
              {`ID: ${panel.id}`}
            </text>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              backgroundColor: '#121214',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#27272a',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              gap: 8,
            }}
          >
            <text style={{ fontSize: 12, color: '#a1a1aa' }}>
              Dockable Pane Content
            </text>
            <text style={{ fontSize: 11, color: '#71717a' }}>
              Drag tab header to split or dock into any edge
            </text>
          </div>
        </div>
      )
    },
    [handleOpenFile]
  )

  // Clean empty group state
  const renderEmptyGroup = useCallback(
    (group: DockPanelGroupNode, onAddTab: (groupId: string) => void) => {
      return (
        <div
          testId={`dock-empty-group-${group.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#141416',
            padding: 24,
            gap: 12,
            userSelect: 'none',
          }}
        >
          <text style={{ fontSize: 13, color: '#71717a' }}>
            Empty Pane
          </text>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <Button
              testId={`empty-add-tab-btn-${group.id}`}
              onClick={() => onAddTab(group.id)}
              style={{
                paddingLeft: 12,
                paddingRight: 12,
                height: 28,
                borderRadius: 4,
                backgroundColor: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: '#3f3f46' },
              }}
            >
              <text style={{ fontSize: 12, color: '#f4f4f5' }}>+ New Tab</text>
            </Button>

            <Button
              testId={`empty-add-explorer-btn-${group.id}`}
              onClick={() => handleAddExplorerTab(group.id)}
              style={{
                paddingLeft: 12,
                paddingRight: 12,
                height: 28,
                borderRadius: 4,
                backgroundColor: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: '#3f3f46' },
              }}
            >
              <text style={{ fontSize: 12, color: '#e2795b' }}>+ Explorer</text>
            </Button>
          </div>
        </div>
      )
    },
    [handleAddExplorerTab]
  )

  return (
    <div
      testId="t3d-app-shell"
      onKeyDown={handleGlobalKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#121214',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Minimal Native Titlebar for OS window dragging & controls */}
      <div
        testId="header-titlebar"
        onMouseDown={(e) => handleTitlebarMouseDown(e, renderer)}
        onMouseUp={() => endWindowDrag()}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 34,
          width: '100%',
          backgroundColor: '#161618',
          borderBottomWidth: 1,
          borderColor: '#27272a',
          paddingLeft: isDarwin ? 80 : 12,
          paddingRight: 12,
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <text style={{ fontSize: 12, fontWeight: 'bold', color: '#f4f4f5' }}>
            Morsel
          </text>
          <text style={{ fontSize: 11, color: '#71717a' }}>
            Dockable Layout
          </text>
        </div>

        {/* Search & Command Palette triggers in Titlebar */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Button
            testId="titlebar-quick-open-btn"
            onClick={(e: any) => {
              e?.stopPropagation?.()
              handleOpenQuickOpen()
            }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 22,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 4,
              backgroundColor: '#1f1f23',
              borderWidth: 1,
              borderColor: '#2f2f35',
              cursor: 'pointer',
              hover: { backgroundColor: '#27272a' },
            }}
          >
            <text style={{ fontSize: 11, color: '#a1a1aa' }}>
              Search files (Ctrl+P)
            </text>
          </Button>

          <Button
            testId="titlebar-command-palette-btn"
            onClick={(e: any) => {
              e?.stopPropagation?.()
              handleOpenCommandPalette()
            }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              height: 22,
              paddingLeft: 8,
              paddingRight: 8,
              borderRadius: 4,
              backgroundColor: '#1f1f23',
              borderWidth: 1,
              borderColor: '#2f2f35',
              cursor: 'pointer',
              hover: { backgroundColor: '#27272a' },
            }}
          >
            <text style={{ fontSize: 11, color: '#a1a1aa' }}>
              Commands (Ctrl+Shift+P)
            </text>
          </Button>
        </div>

        {/* Window Controls on non-macOS */}
        {!isDarwin && typeof document === 'undefined' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Button
              testId="window-minimize"
              aria-label="Minimize"
              onClick={(e: any) => {
                e?.stopPropagation?.()
                renderer?.minimizeWindow?.()
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: '#27272a' },
              }}
            >
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>─</text>
            </Button>

            <Button
              testId="window-maximize"
              aria-label={maximized ? 'Restore' : 'Maximize'}
              onClick={(e: any) => {
                e?.stopPropagation?.()
                if (!renderer) return
                toggleWindowZoom(renderer)
                setMaximized(isWindowMaximized())
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: '#27272a' },
              }}
            >
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>□</text>
            </Button>

            <Button
              testId="window-close"
              aria-label="Close"
              onClick={(e: any) => {
                e?.stopPropagation?.()
                if (typeof process !== 'undefined' && process.exit) {
                  process.exit(0)
                }
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                hover: { backgroundColor: '#ef4444' },
              }}
            >
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>✕</text>
            </Button>
          </div>
        )}
      </div>

      {/* Pure, flexible, resizable, dockable layout engine filling the entire window */}
      <div
        testId="t3d-dock-workspace-area"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <DockContainer
          initialLayout={shellLayout}
          onLayoutChange={(l) => setShellLayout(l)}
          renderPanel={renderPanel}
          renderEmptyGroup={renderEmptyGroup}
          showControls={false}
        />
      </div>

      {/* Command Palette / Quick Open Overlay */}
      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        files={quickOpenFiles}
        onSelectFile={(f) => handleOpenFile(f.path, f.name)}
      />
    </div>
  )
}
