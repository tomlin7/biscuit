import type {
  DockDropZone,
  DockLayoutState,
  DockNode,
  DockPanel,
  DockPanelGroupNode,
  DockSplitDirection,
  DockSplitNode,
  RectBounds,
} from './types'

let dockCounter = 1

export function generateDockId(prefix: string = 'node'): string {
  return `dock-${prefix}-${Date.now().toString(36)}-${(dockCounter++).toString(36)}`
}

/**
 * Creates a clean default dock layout with pure containers (no bloated elements).
 */
export function createInitialDockLayout(initialPanels?: DockPanel[]): DockLayoutState {
  if (initialPanels && initialPanels.length > 0) {
    const groupId = generateDockId('group')
    const root: DockPanelGroupNode = {
      id: groupId,
      type: 'group',
      panels: initialPanels,
      activePanelId: initialPanels[0].id,
    }
    return {
      root,
      activeGroupId: groupId,
    }
  }

  // Clean minimal starter layout: left group and a main right group split vertically
  const leftGroupId = generateDockId('group')
  const mainGroupId = generateDockId('group')
  const bottomGroupId = generateDockId('group')

  const leftGroup: DockPanelGroupNode = {
    id: leftGroupId,
    type: 'group',
    panels: [
      { id: 'dock-panel-sidebar', title: 'Navigation', closable: true },
    ],
    activePanelId: 'dock-panel-sidebar',
  }

  const mainGroup: DockPanelGroupNode = {
    id: mainGroupId,
    type: 'group',
    panels: [
      { id: 'dock-panel-main-1', title: 'Workspace A', closable: true },
      { id: 'dock-panel-main-2', title: 'Workspace B', closable: true },
    ],
    activePanelId: 'dock-panel-main-1',
  }

  const bottomGroup: DockPanelGroupNode = {
    id: bottomGroupId,
    type: 'group',
    panels: [
      { id: 'dock-panel-console', title: 'Console', closable: true },
    ],
    activePanelId: 'dock-panel-console',
  }

  const rightSplit: DockSplitNode = {
    id: generateDockId('split'),
    type: 'split',
    direction: 'vertical',
    ratio: 0.7,
    first: mainGroup,
    second: bottomGroup,
  }

  const rootSplit: DockSplitNode = {
    id: generateDockId('split'),
    type: 'split',
    direction: 'horizontal',
    ratio: 0.25,
    first: leftGroup,
    second: rightSplit,
  }

  return {
    root: rootSplit,
    activeGroupId: mainGroupId,
  }
}

/**
 * Recursively find any node by ID in the dock tree.
 */
export function findNode(root: DockNode | null, id: string): DockNode | null {
  if (!root) return null
  if (root.id === id) return root
  if (root.type === 'split') {
    const inFirst = findNode(root.first, id)
    if (inFirst) return inFirst
    return findNode(root.second, id)
  }
  return null
}

/**
 * Find the parent split of a node by target ID.
 */
export function findParentSplit(
  root: DockNode | null,
  targetId: string
): { parent: DockSplitNode; childKey: 'first' | 'second' } | null {
  if (!root || root.type !== 'split') return null

  if (root.first.id === targetId) {
    return { parent: root, childKey: 'first' }
  }
  if (root.second.id === targetId) {
    return { parent: root, childKey: 'second' }
  }

  const fromFirst = findParentSplit(root.first, targetId)
  if (fromFirst) return fromFirst

  return findParentSplit(root.second, targetId)
}

/**
 * Find the panel group containing a specific panel.
 */
export function findGroupContainingPanel(
  root: DockNode | null,
  panelId: string
): DockPanelGroupNode | null {
  if (!root) return null
  if (root.type === 'group') {
    if (root.panels.some((p) => p.id === panelId)) {
      return root
    }
    return null
  }
  return (
    findGroupContainingPanel(root.first, panelId) ??
    findGroupContainingPanel(root.second, panelId)
  )
}

/**
 * Find a group by its ID.
 */
export function findGroupById(root: DockNode | null, groupId: string): DockPanelGroupNode | null {
  const node = findNode(root, groupId)
  return node && node.type === 'group' ? node : null
}

/**
 * Collect all panel groups in the tree.
 */
export function getAllGroups(root: DockNode | null): DockPanelGroupNode[] {
  if (!root) return []
  if (root.type === 'group') return [root]
  return [...getAllGroups(root.first), ...getAllGroups(root.second)]
}

/**
 * Collect all panels across the entire dock tree.
 */
export function getAllPanels(root: DockNode | null): DockPanel[] {
  return getAllGroups(root).flatMap((g) => g.panels)
}

/**
 * Calculate drop edge / zone from pointer coordinates relative to bounding box.
 */
export function calculateDropZone(
  rect: RectBounds,
  mouseX: number,
  mouseY: number,
  edgeThreshold: number = 0.25
): DockDropZone {
  if (rect.width <= 0 || rect.height <= 0) return 'center'

  const clampedX = Math.max(0, Math.min(1, (mouseX - rect.x) / rect.width))
  const clampedY = Math.max(0, Math.min(1, (mouseY - rect.y) / rect.height))

  const distLeft = clampedX
  const distRight = 1 - clampedX
  const distTop = clampedY
  const distBottom = 1 - clampedY

  const minDist = Math.min(distLeft, distRight, distTop, distBottom)

  if (minDist >= edgeThreshold) {
    return 'center'
  }

  if (minDist === distLeft) return 'left'
  if (minDist === distRight) return 'right'
  if (minDist === distTop) return 'top'
  return 'bottom'
}

/**
 * Recursively prune groups that have no panels, collapsing intermediate split nodes.
 */
export function pruneEmptyGroups(node: DockNode | null): DockNode | null {
  if (!node) return null

  if (node.type === 'group') {
    if (node.panels.length === 0) return null
    // Ensure activePanelId points to an existing panel
    if (!node.panels.some((p) => p.id === node.activePanelId)) {
      return {
        ...node,
        activePanelId: node.panels[0].id,
      }
    }
    return node
  }

  // Node is split
  const prunedFirst = pruneEmptyGroups(rootClone(node.first))
  const prunedSecond = pruneEmptyGroups(rootClone(node.second))

  if (!prunedFirst && !prunedSecond) return null
  if (!prunedFirst && prunedSecond) return prunedSecond
  if (prunedFirst && !prunedSecond) return prunedFirst

  return {
    ...node,
    first: prunedFirst!,
    second: prunedSecond!,
  }
}

function rootClone<T extends DockNode>(node: T): T {
  if (node.type === 'group') {
    return {
      ...node,
      panels: [...node.panels],
    } as T
  }
  return {
    ...node,
    first: rootClone(node.first),
    second: rootClone(node.second),
  } as T
}

/**
 * Split a group with a new panel.
 */
export function splitGroup(
  state: DockLayoutState,
  targetGroupId: string,
  panel: DockPanel,
  direction: DockSplitDirection,
  position: 'first' | 'second',
  ratio: number = 0.5
): DockLayoutState {
  if (!state.root) {
    const groupId = generateDockId('group')
    return {
      root: {
        id: groupId,
        type: 'group',
        panels: [panel],
        activePanelId: panel.id,
      },
      activeGroupId: groupId,
    }
  }

  const targetGroup = findGroupById(state.root, targetGroupId)
  if (!targetGroup) return state

  const newGroupId = generateDockId('group')
  const newGroup: DockPanelGroupNode = {
    id: newGroupId,
    type: 'group',
    panels: [panel],
    activePanelId: panel.id,
  }

  const splitNode: DockSplitNode = {
    id: generateDockId('split'),
    type: 'split',
    direction,
    ratio: Math.max(0.05, Math.min(0.95, ratio)),
    first: position === 'first' ? newGroup : targetGroup,
    second: position === 'first' ? targetGroup : newGroup,
  }

  const replaceInTree = (current: DockNode): DockNode => {
    if (current.id === targetGroupId) {
      return splitNode
    }
    if (current.type === 'split') {
      return {
        ...current,
        first: replaceInTree(current.first),
        second: replaceInTree(current.second),
      }
    }
    return current
  }

  const updatedRoot = replaceInTree(state.root)
  return {
    ...state,
    root: updatedRoot,
    activeGroupId: newGroupId,
  }
}

/**
 * Dock a panel into a target group with dropZone ('left', 'right', 'top', 'bottom', or 'center').
 */
export function dockPanel(
  state: DockLayoutState,
  sourcePanelId: string,
  targetGroupId: string,
  dropZone: DockDropZone,
  ratio: number = 0.5
): DockLayoutState {
  if (!state.root) return state

  const sourceGroup = findGroupContainingPanel(state.root, sourcePanelId)
  const targetGroup = findGroupById(state.root, targetGroupId)

  if (!sourceGroup || !targetGroup) return state

  const panel = sourceGroup.panels.find((p) => p.id === sourcePanelId)
  if (!panel) return state

  // If dropping in the same group and center, simply make it active
  if (sourceGroup.id === targetGroup.id && dropZone === 'center') {
    return setActivePanel(state, targetGroupId, sourcePanelId)
  }

  // If dropping in same group and it's the only panel, splitting would have no other panel
  if (sourceGroup.id === targetGroup.id && sourceGroup.panels.length === 1) {
    return state
  }

  // 1. Remove panel from source group
  const removePanelFromTree = (current: DockNode): DockNode => {
    if (current.type === 'group') {
      if (current.id === sourceGroup.id) {
        const remaining = current.panels.filter((p) => p.id !== sourcePanelId)
        const nextActiveId =
          current.activePanelId === sourcePanelId
            ? remaining[0]?.id ?? ''
            : current.activePanelId
        return {
          ...current,
          panels: remaining,
          activePanelId: nextActiveId,
        }
      }
      return current
    }
    return {
      ...current,
      first: removePanelFromTree(current.first),
      second: removePanelFromTree(current.second),
    }
  }

  let intermediateRoot = removePanelFromTree(state.root)

  // 2. Add or split in target group
  if (dropZone === 'center') {
    const addCenterToTree = (current: DockNode): DockNode => {
      if (current.type === 'group') {
        if (current.id === targetGroupId) {
          const exists = current.panels.some((p) => p.id === panel.id)
          const nextPanels = exists ? current.panels : [...current.panels, panel]
          return {
            ...current,
            panels: nextPanels,
            activePanelId: panel.id,
          }
        }
        return current
      }
      return {
        ...current,
        first: addCenterToTree(current.first),
        second: addCenterToTree(current.second),
      }
    }
    intermediateRoot = addCenterToTree(intermediateRoot)
  } else {
    // Edge docking: create a new group and split the target group
    const newGroupId = generateDockId('group')
    const newGroup: DockPanelGroupNode = {
      id: newGroupId,
      type: 'group',
      panels: [panel],
      activePanelId: panel.id,
    }

    const direction: DockSplitDirection =
      dropZone === 'left' || dropZone === 'right' ? 'horizontal' : 'vertical'
    const isFirst = dropZone === 'left' || dropZone === 'top'
    const cleanRatio = isFirst ? ratio : 1 - ratio

    const splitTargetInTree = (current: DockNode): DockNode => {
      if (current.id === targetGroupId) {
        return {
          id: generateDockId('split'),
          type: 'split',
          direction,
          ratio: Math.max(0.05, Math.min(0.95, cleanRatio)),
          first: isFirst ? newGroup : current,
          second: isFirst ? current : newGroup,
        }
      }
      if (current.type === 'split') {
        return {
          ...current,
          first: splitTargetInTree(current.first),
          second: splitTargetInTree(current.second),
        }
      }
      return current
    }

    intermediateRoot = splitTargetInTree(intermediateRoot)
  }

  // 3. Prune empty groups
  const finalRoot = pruneEmptyGroups(intermediateRoot)

  // 4. Update activeGroupId
  const targetGroupStillExists = finalRoot ? findGroupById(finalRoot, targetGroupId) : null
  const fallbackGroup = finalRoot ? getAllGroups(finalRoot)[0]?.id : undefined

  return {
    root: finalRoot,
    activeGroupId: targetGroupStillExists ? targetGroupId : fallbackGroup,
  }
}

/**
 * Close a panel across the layout.
 */
export function closePanel(state: DockLayoutState, panelId: string): DockLayoutState {
  if (!state.root) return state

  const removePanel = (current: DockNode): DockNode => {
    if (current.type === 'group') {
      const idx = current.panels.findIndex((p) => p.id === panelId)
      if (idx === -1) return current

      const target = current.panels[idx]
      if (target.closable === false) return current

      const remaining = current.panels.filter((p) => p.id !== panelId)
      let nextActiveId = current.activePanelId
      if (current.activePanelId === panelId) {
        // Choose adjacent tab if possible
        const nextPanel = remaining[idx] ?? remaining[idx - 1] ?? remaining[0]
        nextActiveId = nextPanel ? nextPanel.id : ''
      }

      return {
        ...current,
        panels: remaining,
        activePanelId: nextActiveId,
      }
    }

    return {
      ...current,
      first: removePanel(current.first),
      second: removePanel(current.second),
    }
  }

  const updated = removePanel(state.root)
  const pruned = pruneEmptyGroups(updated)

  const activeGroupValid = pruned && state.activeGroupId ? findGroupById(pruned, state.activeGroupId) : null
  const fallbackGroupId = pruned ? getAllGroups(pruned)[0]?.id : undefined

  return {
    root: pruned,
    activeGroupId: activeGroupValid ? state.activeGroupId : fallbackGroupId,
  }
}

/**
 * Reorder tabs within a single panel group.
 */
export function moveTab(
  state: DockLayoutState,
  groupId: string,
  fromIndex: number,
  toIndex: number
): DockLayoutState {
  if (!state.root) return state

  const updateGroup = (current: DockNode): DockNode => {
    if (current.type === 'group') {
      if (current.id === groupId) {
        if (
          fromIndex < 0 ||
          fromIndex >= current.panels.length ||
          toIndex < 0 ||
          toIndex >= current.panels.length ||
          fromIndex === toIndex
        ) {
          return current
        }

        const nextPanels = [...current.panels]
        const [moved] = nextPanels.splice(fromIndex, 1)
        nextPanels.splice(toIndex, 0, moved)

        return {
          ...current,
          panels: nextPanels,
        }
      }
      return current
    }
    return {
      ...current,
      first: updateGroup(current.first),
      second: updateGroup(current.second),
    }
  }

  return {
    ...state,
    root: updateGroup(state.root),
  }
}

/**
 * Set the active tab panel in a group.
 */
export function setActivePanel(
  state: DockLayoutState,
  groupId: string,
  panelId: string
): DockLayoutState {
  if (!state.root) return state

  const updateGroup = (current: DockNode): DockNode => {
    if (current.type === 'group') {
      if (current.id === groupId) {
        if (current.panels.some((p) => p.id === panelId)) {
          return {
            ...current,
            activePanelId: panelId,
          }
        }
      }
      return current
    }
    return {
      ...current,
      first: updateGroup(current.first),
      second: updateGroup(current.second),
    }
  }

  return {
    ...state,
    root: updateGroup(state.root),
    activeGroupId: groupId,
  }
}

/**
 * Resize a split divider ratio.
 */
export function resizeSplit(
  state: DockLayoutState,
  splitId: string,
  newRatio: number
): DockLayoutState {
  if (!state.root) return state

  const clamped = Math.max(0.05, Math.min(0.95, newRatio))

  const updateSplit = (current: DockNode): DockNode => {
    if (current.type === 'split') {
      if (current.id === splitId) {
        return {
          ...current,
          ratio: clamped,
        }
      }
      return {
        ...current,
        first: updateSplit(current.first),
        second: updateSplit(current.second),
      }
    }
    return current
  }

  return {
    ...state,
    root: updateSplit(state.root),
  }
}

/**
 * Add a panel to an existing group.
 */
export function addPanelToGroup(
  state: DockLayoutState,
  groupId: string,
  panel: DockPanel
): DockLayoutState {
  if (!state.root) {
    return createInitialDockLayout([panel])
  }

  const updateTree = (current: DockNode): DockNode => {
    if (current.type === 'group') {
      if (current.id === groupId) {
        const exists = current.panels.some((p) => p.id === panel.id)
        if (exists) {
          return {
            ...current,
            activePanelId: panel.id,
          }
        }
        return {
          ...current,
          panels: [...current.panels, panel],
          activePanelId: panel.id,
        }
      }
      return current
    }
    return {
      ...current,
      first: updateTree(current.first),
      second: updateTree(current.second),
    }
  }

  return {
    ...state,
    root: updateTree(state.root),
    activeGroupId: groupId,
  }
}

/**
 * Serialize dock layout state to JSON string.
 */
export function serializeDockLayout(state: DockLayoutState): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Safely deserialize dock layout state from JSON string.
 */
export function deserializeDockLayout(
  json: string,
  defaultFallback?: DockLayoutState
): DockLayoutState {
  try {
    const parsed = JSON.parse(json) as DockLayoutState
    if (!parsed || typeof parsed !== 'object') {
      return defaultFallback ?? createInitialDockLayout()
    }

    const validateNode = (node: any): DockNode | null => {
      if (!node || typeof node !== 'object') return null
      if (node.type === 'group') {
        if (!node.id || !Array.isArray(node.panels)) return null
        return {
          id: String(node.id),
          type: 'group',
          panels: node.panels
            .filter((p: any) => p && typeof p === 'object')
            .map((p: any) => ({
              id: p.id ? String(p.id) : generateDockId('panel'),
              title: String(p.title ?? 'Panel'),
              closable: p.closable !== false,
              icon: p.icon ? String(p.icon) : undefined,
              data: p.data && typeof p.data === 'object' ? p.data : undefined,
            })),
          activePanelId: String(node.activePanelId ?? node.panels[0]?.id ?? ''),
        }
      }
      if (node.type === 'split') {
        const first = validateNode(node.first)
        const second = validateNode(node.second)
        if (!first || !second) return first ?? second
        const ratio = typeof node.ratio === 'number' ? Math.max(0.05, Math.min(0.95, node.ratio)) : 0.5
        const direction: DockSplitDirection = node.direction === 'vertical' ? 'vertical' : 'horizontal'
        return {
          id: String(node.id ?? generateDockId('split')),
          type: 'split',
          direction,
          ratio,
          first,
          second,
        }
      }
      return null
    }

    const validatedRoot = parsed.root ? validateNode(parsed.root) : null
    const pruned = pruneEmptyGroups(validatedRoot)

    return {
      root: pruned,
      activeGroupId: parsed.activeGroupId ? String(parsed.activeGroupId) : undefined,
    }
  } catch {
    return defaultFallback ?? createInitialDockLayout()
  }
}


/**
 * Creates an empty dock layout without pre-populated split panes.
 */
export function createEmptyDockLayout(initialTitle?: string): DockLayoutState {
  const groupId = generateDockId('group')
  if (initialTitle) {
    const panelId = generateDockId('panel')
    return {
      root: {
        id: groupId,
        type: 'group',
        panels: [
          {
            id: panelId,
            title: initialTitle,
            closable: true,
          },
        ],
        activePanelId: panelId,
      },
      activeGroupId: groupId,
    }
  }

  return {
    root: {
      id: groupId,
      type: 'group',
      panels: [],
      activePanelId: '',
    },
    activeGroupId: groupId,
  }
}
