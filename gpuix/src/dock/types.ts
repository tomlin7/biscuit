/**
 * GPUIX Dockable Layout Engine - Types
 *
 * Provides a flexible, tree-based dockable layout model supporting:
 * - Nested split containers (horizontal/vertical)
 * - Docked panel groups with tabs
 * - Interactive divider resizing
 * - Drag-and-drop docking to edges (left, right, top, bottom) or center (tab)
 * - Clean serialization / deserialization for layout persistence
 */

export type DockDropZone = 'left' | 'right' | 'top' | 'bottom' | 'center'

export type DockSplitDirection = 'horizontal' | 'vertical'

export interface DockPanel {
  id: string
  title: string
  closable?: boolean
  icon?: string
  data?: Record<string, unknown>
}

export interface DockPanelGroupNode {
  id: string
  type: 'group'
  panels: DockPanel[]
  activePanelId: string
}

export interface DockSplitNode {
  id: string
  type: 'split'
  direction: DockSplitDirection
  ratio: number // 0.05 to 0.95 fraction allocated to `first`
  first: DockNode
  second: DockNode
}

export type DockNode = DockSplitNode | DockPanelGroupNode

export interface DockLayoutState {
  root: DockNode | null
  activeGroupId?: string
}

export interface DockDragState {
  panelId: string
  sourceGroupId: string
  panel: DockPanel
  currentX: number
  currentY: number
  targetGroupId?: string
  targetZone?: DockDropZone
}

export interface DockResizeState {
  splitId: string
  direction: DockSplitDirection
  startX: number
  startY: number
  initialRatio: number
  totalDimension: number
}

export interface RectBounds {
  x: number
  y: number
  width: number
  height: number
}
