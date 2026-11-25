import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@gpuix/react'
import type {
  DockDragState,
  DockDropZone,
  DockLayoutState,
  DockNode,
  DockPanel,
  DockPanelGroupNode,
  DockResizeState,
  DockSplitDirection,
  DockSplitNode,
} from './types'
import {
  addPanelToGroup,
  calculateDropZone,
  closePanel,
  createInitialDockLayout,
  deserializeDockLayout,
  dockPanel,
  findGroupById,
  getAllGroups,
  getAllPanels,
  resizeSplit,
  serializeDockLayout,
  setActivePanel,
  splitGroup,
} from './model'
import { DockSplitHandle } from './DockSplitHandle'
import { DockPanelGroupView } from './DockPanelGroupView'

export interface DockContainerProps {
  initialLayout?: DockLayoutState
  onLayoutChange?: (layout: DockLayoutState) => void
  renderPanel?: (panel: DockPanel, group: DockPanelGroupNode) => React.ReactNode
  renderEmptyGroup?: (group: DockPanelGroupNode, onAddTab: (groupId: string) => void) => React.ReactNode
  showControls?: boolean
}

const STORAGE_KEY = 'gpuix-dockable-layout-state'

export function DockContainer({
  initialLayout,
  onLayoutChange,
  renderPanel,
  renderEmptyGroup,
  showControls = true,
}: DockContainerProps) {
  const [layout, setLayout] = useState<DockLayoutState>(() => {
    return initialLayout ?? createInitialDockLayout()
  })

  const [dragState, setDragState] = useState<DockDragState | null>(null)
  const [resizeState, setResizeState] = useState<DockResizeState | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const containerRef = useRef<any>(null)

  const updateLayout = useCallback(
    (updater: (prev: DockLayoutState) => DockLayoutState) => {
      setLayout((prev) => updater(prev))
    },
    []
  )

  useEffect(() => {
    if (initialLayout) {
      setLayout(initialLayout)
    }
  }, [initialLayout])

  useEffect(() => {
    onLayoutChange?.(layout)
  }, [layout, onLayoutChange])

  // Split handle resizing
  const handleStartResize = useCallback(
    (e: any, splitId: string, direction: DockSplitDirection) => {
      e.stopPropagation?.()
      const clientX = e.clientX ?? e.x ?? 0
      const clientY = e.clientY ?? e.y ?? 0

      // Dynamic container measurement (fallback to 800x600 if unmeasured)
      const isHorizontal = direction === 'horizontal'
      let totalDimension = isHorizontal ? 800 : 600

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect?.()
        if (rect && rect.width > 0 && rect.height > 0) {
          totalDimension = isHorizontal ? rect.width : rect.height
        } else if (containerRef.current.offsetWidth || containerRef.current.clientWidth) {
          const w = containerRef.current.offsetWidth ?? containerRef.current.clientWidth
          const h = containerRef.current.offsetHeight ?? containerRef.current.clientHeight
          if (w > 0 && h > 0) {
            totalDimension = isHorizontal ? w : h
          }
        }
      }

      // Find current ratio
      let currentRatio = 0.5
      const searchNode = (n: DockNode | null) => {
        if (!n) return
        if (n.type === 'split') {
          if (n.id === splitId) {
            currentRatio = n.ratio
            return
          }
          searchNode(n.first)
          searchNode(n.second)
        }
      }
      searchNode(layout.root)

      setResizeState({
        splitId,
        direction,
        startX: clientX,
        startY: clientY,
        initialRatio: currentRatio,
        totalDimension,
      })
    },
    [layout.root]
  )

    interface PendingTabDrag {
    panel: DockPanel
    sourceGroupId: string
    startX: number
    startY: number
  }

  const pendingDragRef = useRef<PendingTabDrag | null>(null)

  // Start dragging a tab to dock: stage pending drag, wait for movement threshold
  const handleStartDragTab = useCallback(
    (e: any, panel: DockPanel, sourceGroupId: string) => {
      e.stopPropagation?.()
      const clientX = e.clientX ?? e.x ?? 0
      const clientY = e.clientY ?? e.y ?? 0

      pendingDragRef.current = {
        panel,
        sourceGroupId,
        startX: clientX,
        startY: clientY,
      }
    },
    []
  )

  const commitDock = useCallback(
    (targetZone?: DockDropZone) => {
      if (!dragState) return
      const zone = targetZone ?? dragState.targetZone ?? 'center'
      if (dragState.targetGroupId) {
        updateLayout((prev) => {
          const next = dockPanel(
            prev,
            dragState.panelId,
            dragState.targetGroupId!,
            zone
          )
          return next
        })
      }
      setDragState(null)
      pendingDragRef.current = null
    },
    [dragState, updateLayout]
  )

  const handleCancelDrag = useCallback(() => {
    if (!dragState) {
      pendingDragRef.current = null
      return
    }
    commitDock()
  }, [dragState, commitDock])

  // Mouse move over container
  const handleContainerMouseMove = useCallback(
    (e: any) => {
      const clientX = e.clientX ?? e.x ?? 0
      const clientY = e.clientY ?? e.y ?? 0
      
      // Only enter drag state if pointer moved beyond 4px drag threshold
      if (pendingDragRef.current && !dragState) {
        const dx = clientX - pendingDragRef.current.startX
        const dy = clientY - pendingDragRef.current.startY
        if (Math.hypot(dx, dy) >= 4) {
          const { panel, sourceGroupId } = pendingDragRef.current
          setDragState({
            panelId: panel.id,
            sourceGroupId,
            panel,
            currentX: clientX,
            currentY: clientY,
            targetGroupId: sourceGroupId,
            targetZone: undefined,
          })
        }
      }

      // Handle split divider resizing
      if (resizeState) {
        const isHorizontal = resizeState.direction === 'horizontal'
        const delta = isHorizontal
          ? (clientX - resizeState.startX) / resizeState.totalDimension
          : (clientY - resizeState.startY) / resizeState.totalDimension
        const newRatio = resizeState.initialRatio + delta
        updateLayout((prev) => resizeSplit(prev, resizeState.splitId, newRatio))
      }

      // Handle tab dragging
      if (dragState) {
        let detectedZone: DockDropZone = dragState.targetZone ?? 'center'
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect?.()
          const x = rect?.left ?? 0
          const y = rect?.top ?? 0
          const w = rect?.width ?? containerRef.current.offsetWidth ?? containerRef.current.clientWidth ?? 1000
          const h = rect?.height ?? containerRef.current.offsetHeight ?? containerRef.current.clientHeight ?? 700
          if (w > 0 && h > 0) {
            detectedZone = calculateDropZone({ x, y, width: w, height: h }, clientX, clientY, 0.25)
          }
        } else {
          detectedZone = calculateDropZone({ x: 0, y: 0, width: 1000, height: 700 }, clientX, clientY, 0.25)
        }

        setDragState((prev) =>
          prev
            ? {
                ...prev,
                currentX: clientX,
                currentY: clientY,
                targetZone: detectedZone,
              }
            : null
        )
      }
    },
    [resizeState, dragState, updateLayout]
  )

  // Mouse up over container (finish drag or resize)
  const handleContainerMouseUp = useCallback(() => {
    pendingDragRef.current = null

    if (resizeState) {
      setResizeState(null)
    }

    if (dragState) {
      commitDock()
    }
  }, [resizeState, dragState, commitDock])

  // Hover drop zone on a group during drag
  const handleHoverZone = useCallback(
    (groupId: string, zone: DockDropZone) => {
      setDragState((prev) => {
        if (!prev) return null
        return {
          ...prev,
          targetGroupId: groupId,
          targetZone: zone,
        }
      })
    },
    []
  )

  // Select drop zone on a hovered group (direct click or drop)
  const handleSelectZone = useCallback(
    (groupId: string, zone: DockDropZone) => {
      if (dragState) {
        updateLayout((prev) =>
          dockPanel(prev, dragState.panelId, groupId, zone)
        )
        setDragState(null)
      }
    },
    [dragState, updateLayout]
  )

  // Tab and group management
  const handleSelectGroup = useCallback(
    (groupId: string) => {
      updateLayout((prev) => ({ ...prev, activeGroupId: groupId }))
    },
    [updateLayout]
  )

  const handleSelectTab = useCallback(
    (groupId: string, panelId: string) => {
      updateLayout((prev) => setActivePanel(prev, groupId, panelId))
    },
    [updateLayout]
  )

  const handleCloseTab = useCallback(
    (panelId: string) => {
      updateLayout((prev) => closePanel(prev, panelId))
    },
    [updateLayout]
  )

  const handleAddTab = useCallback(
    (groupId: string) => {
      const newId = `dock-panel-${Date.now().toString(36)}`
      const newPanel: DockPanel = {
        id: newId,
        title: `Panel ${newId.slice(-4)}`,
        closable: true,
      }
      updateLayout((prev) => addPanelToGroup(prev, groupId, newPanel))
    },
    [updateLayout]
  )

  const handleSplitHorizontal = useCallback(
    (groupId: string) => {
      const newId = `dock-panel-${Date.now().toString(36)}`
      const newPanel: DockPanel = {
        id: newId,
        title: `Panel ${newId.slice(-4)}`,
        closable: true,
      }
      updateLayout((prev) =>
        splitGroup(prev, groupId, newPanel, 'horizontal', 'second', 0.5)
      )
    },
    [updateLayout]
  )

  const handleSplitVertical = useCallback(
    (groupId: string) => {
      const newId = `dock-panel-${Date.now().toString(36)}`
      const newPanel: DockPanel = {
        id: newId,
        title: `Panel ${newId.slice(-4)}`,
        closable: true,
      }
      updateLayout((prev) =>
        splitGroup(prev, groupId, newPanel, 'vertical', 'second', 0.5)
      )
    },
    [updateLayout]
  )

  // Save / restore persistence
  const handleSaveLayout = useCallback(() => {
    try {
      const serialized = serializeDockLayout(layout)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized)
      }
      setStatusMessage('Layout saved')
      setTimeout(() => setStatusMessage(''), 3000)
    } catch {
      setStatusMessage('Failed to save')
    }
  }, [layout])

  const handleRestoreLayout = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const restored = deserializeDockLayout(saved)
          updateLayout(() => restored)
          setStatusMessage('Layout restored')
          setTimeout(() => setStatusMessage(''), 3000)
          return
        }
      }
      // If nothing saved, re-initialize
      const defaultLayout = createInitialDockLayout()
      updateLayout(() => defaultLayout)
      setStatusMessage('Layout reset to default')
      setTimeout(() => setStatusMessage(''), 3000)
    } catch {
      setStatusMessage('Failed to restore')
    }
  }, [updateLayout])

  const handleResetLayout = useCallback(() => {
    const defaultLayout = createInitialDockLayout()
    updateLayout(() => defaultLayout)
    setStatusMessage('Layout reset')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [updateLayout])

  // Recursive renderer for dock nodes
  const renderNode = (node: DockNode | null): React.ReactNode => {
    if (!node) return null

    if (node.type === 'split') {
      const isHorizontal = node.direction === 'horizontal'
      return (
        <div
          key={node.id}
          testId={`dock-split-${node.id}`}
          style={{
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            minWidth: 0,
            minHeight: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* First child */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: node.ratio,
              flexShrink: 1,
              flexBasis: 0,
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {renderNode(node.first)}
          </div>

          {/* Interactive Split Divider Handle */}
          <DockSplitHandle
            splitId={node.id}
            direction={node.direction}
            onStartResize={handleStartResize}
          />

          {/* Second child */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1 - node.ratio,
              flexShrink: 1,
              flexBasis: 0,
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {renderNode(node.second)}
          </div>
        </div>
      )
    }

    // Node is a panel group
    const canSelfDrop = node.panels.length > 1
    const isDragHovered =
      dragState !== null &&
      (dragState.sourceGroupId !== node.id || canSelfDrop)

    return (
      <DockPanelGroupView
        key={node.id}
        group={node}
        isActiveGroup={layout.activeGroupId === node.id}
        onSelectGroup={handleSelectGroup}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        onStartDragTab={handleStartDragTab}
        onCancelDrag={handleCancelDrag}
        onMouseMove={handleContainerMouseMove}
        onSplitHorizontal={handleSplitHorizontal}
        onSplitVertical={handleSplitVertical}
        isDragHovered={isDragHovered}
        dragHoverZone={dragState?.targetGroupId === node.id ? (dragState.targetZone ?? 'center') : 'center'}
        onHoverZone={(zone) => handleHoverZone(node.id, zone)}
        onSelectZone={(zone) => handleSelectZone(node.id, zone)}
        renderPanel={renderPanel}
        renderEmptyGroup={renderEmptyGroup ? (g) => renderEmptyGroup(g, handleAddTab) : undefined}
      />
    )
  }

  const allPanels = getAllPanels(layout.root)
  const allGroups = getAllGroups(layout.root)

  return (
    <div
      ref={containerRef}
      testId="dock-container"
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#121214',
        overflow: 'hidden',
        position: 'relative',
        userSelect: resizeState || dragState ? 'none' : 'auto',
      }}
    >
      {/* Optional Dock Controls Bar */}
      {showControls && (
        <div
          testId="dock-controls-bar"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 12,
            paddingRight: 12,
            height: 34,
            backgroundColor: '#161618',
            borderBottomWidth: 1,
            borderColor: '#27272a',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <text style={{ fontSize: 12, fontWeight: 'bold', color: '#f4f4f5' }}>
              Dockable Layout Engine
            </text>
            <text style={{ fontSize: 11, color: '#71717a' }}>
              {`${allGroups.length} groups · ${allPanels.length} panels`}
            </text>
            {statusMessage && (
              <text style={{ fontSize: 11, color: '#e2795b' }}>
                {statusMessage}
              </text>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Button
              testId="dock-save-btn"
              onClick={handleSaveLayout}
              style={{
                height: 24,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: 4,
                backgroundColor: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: '#e4e4e7' }}>Save</text>
            </Button>

            <Button
              testId="dock-restore-btn"
              onClick={handleRestoreLayout}
              style={{
                height: 24,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: 4,
                backgroundColor: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: '#e4e4e7' }}>Restore</text>
            </Button>

            <Button
              testId="dock-reset-btn"
              onClick={handleResetLayout}
              style={{
                height: 24,
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: 4,
                backgroundColor: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: '#e4e4e7' }}>Reset</text>
            </Button>
          </div>
        </div>
      )}

      {/* Dock Tree Root View */}
      <div
        testId="dock-root"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {layout.root ? (
          renderNode(layout.root)
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <text style={{ fontSize: 13, color: '#71717a' }}>No layout nodes</text>
            <Button
              testId="dock-reset-btn"
              onClick={handleResetLayout}
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 4,
                backgroundColor: '#27272a',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 12, color: '#e2795b' }}>Restore Starter Layout</text>
            </Button>
          </div>
        )}
      </div>

      {/* Dragging ghost indicator */}
      {dragState && (
        <div
          testId="dock-drag-ghost"
          style={{
            position: 'absolute',
            left: (dragState.currentX ?? 0) + 12,
            top: (dragState.currentY ?? 0) + 12,
            backgroundColor: '#222226ee',
            borderWidth: 1,
            borderColor: '#e2795b',
            borderRadius: 4,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4,
            pointerEvents: 'none',
          }}
        >
          <text style={{ fontSize: 11, color: '#ffffff', fontWeight: 'bold' }}>
            {dragState.panel.title}
          </text>
        </div>
      )}
    </div>
  )
}
