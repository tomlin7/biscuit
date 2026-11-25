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
  type DockLayoutState,
  type DockPanel,
  type DockPanelGroupNode,
} from '../dock'

export interface T3DAppShellProps {
  initialLayout?: DockLayoutState
}

export function T3DAppShell({ initialLayout }: T3DAppShellProps) {
  const { renderer } = useGpuix()
  const isDarwin = typeof process !== 'undefined' && process.platform === 'darwin'
  const [maximized, setMaximized] = useState(false)

  // Clean empty dockable layout
  const emptyLayout = useMemo(() => {
    return initialLayout ?? createEmptyDockLayout()
  }, [initialLayout])

  // Panel content renderer
  const renderPanel = useCallback((panel: DockPanel, group: DockPanelGroupNode) => {
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
            ID: {panel.id}
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
  }, [])

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
        </div>
      )
    },
    []
  )

  return (
    <div
      testId="t3d-app-shell"
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
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>_</text>
            </Button>

            <Button
              testId="window-maximize"
              aria-label={maximized ? 'Restore' : 'Maximize'}
              onClick={(e: any) => {
                e?.stopPropagation?.()
                toggleWindowZoom(renderer)
                setMaximized(isWindowMaximized())
              }}
              onMouseEnter={() => setMaximized(isWindowMaximized())}
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
          initialLayout={emptyLayout}
          renderPanel={renderPanel}
          renderEmptyGroup={renderEmptyGroup}
          showControls={false}
        />
      </div>
    </div>
  )
}
