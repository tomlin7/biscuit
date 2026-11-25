import { describe, expect, it } from 'vitest'
import {
  addPanelToGroup,
  calculateDropZone,
  closePanel,
  createInitialDockLayout,
  deserializeDockLayout,
  dockPanel,
  findGroupById,
  findGroupContainingPanel,
  findNode,
  findParentSplit,
  generateDockId,
  getAllGroups,
  getAllPanels,
  moveTab,
  pruneEmptyGroups,
  resizeSplit,
  serializeDockLayout,
  setActivePanel,
  splitGroup,
} from './model'
import type {
  DockLayoutState,
  DockPanel,
  DockPanelGroupNode,
  DockSplitNode,
  RectBounds,
} from './types'

describe('GPUIX Dock Layout Engine - Tree Model', () => {
  describe('createInitialDockLayout', () => {
    it('creates a default starter layout with split containers and groups', () => {
      const layout = createInitialDockLayout()
      expect(layout.root).not.toBeNull()
      expect(layout.root?.type).toBe('split')

      const groups = getAllGroups(layout.root)
      expect(groups.length).toBeGreaterThanOrEqual(3)

      const panels = getAllPanels(layout.root)
      expect(panels.length).toBeGreaterThanOrEqual(4)
      expect(panels.some((p) => p.id === 'dock-panel-sidebar')).toBe(true)
      expect(panels.some((p) => p.id === 'dock-panel-main-1')).toBe(true)
    })

    it('creates a single group layout when initialPanels are provided', () => {
      const initial: DockPanel[] = [
        { id: 'custom-1', title: 'Custom 1' },
        { id: 'custom-2', title: 'Custom 2' },
      ]
      const layout = createInitialDockLayout(initial)
      expect(layout.root?.type).toBe('group')

      const group = layout.root as DockPanelGroupNode
      expect(group.panels.length).toBe(2)
      expect(group.activePanelId).toBe('custom-1')
    })
  })

  describe('Node and Group queries', () => {
    it('finds node by id in nested splits', () => {
      const layout = createInitialDockLayout()
      const root = layout.root as DockSplitNode
      expect(findNode(root, root.id)).toBe(root)

      const groups = getAllGroups(root)
      const targetGroup = groups[0]
      expect(findNode(root, targetGroup.id)).toBe(targetGroup)
      expect(findNode(root, 'non-existent-id')).toBeNull()
    })

    it('finds parent split of child node', () => {
      const layout = createInitialDockLayout()
      const root = layout.root as DockSplitNode

      const parentInfo = findParentSplit(root, root.first.id)
      expect(parentInfo).not.toBeNull()
      expect(parentInfo?.parent.id).toBe(root.id)
      expect(parentInfo?.childKey).toBe('first')
    })

    it('finds group containing a specific panel id', () => {
      const layout = createInitialDockLayout()
      const group = findGroupContainingPanel(layout.root, 'dock-panel-sidebar')
      expect(group).not.toBeNull()
      expect(group?.panels.some((p) => p.id === 'dock-panel-sidebar')).toBe(true)

      expect(findGroupContainingPanel(layout.root, 'unknown-panel')).toBeNull()
    })

    it('finds group by group id', () => {
      const layout = createInitialDockLayout()
      const groups = getAllGroups(layout.root)
      const found = findGroupById(layout.root, groups[0].id)
      expect(found).toBe(groups[0])
      expect(findGroupById(layout.root, 'bad-group')).toBeNull()
    })
  })

  describe('calculateDropZone', () => {
    const bounds: RectBounds = { x: 100, y: 100, width: 400, height: 400 }

    it('identifies left edge when within threshold', () => {
      // x = 120 -> relative x = 20/400 = 0.05
      expect(calculateDropZone(bounds, 120, 300, 0.25)).toBe('left')
    })

    it('identifies right edge when within threshold', () => {
      // x = 480 -> relative x = 380/400 = 0.95
      expect(calculateDropZone(bounds, 480, 300, 0.25)).toBe('right')
    })

    it('identifies top edge when within threshold', () => {
      // y = 120 -> relative y = 20/400 = 0.05
      expect(calculateDropZone(bounds, 300, 120, 0.25)).toBe('top')
    })

    it('identifies bottom edge when within threshold', () => {
      // y = 480 -> relative y = 380/400 = 0.95
      expect(calculateDropZone(bounds, 300, 480, 0.25)).toBe('bottom')
    })

    it('identifies center when outside edge threshold', () => {
      // x = 300 (0.5), y = 300 (0.5)
      expect(calculateDropZone(bounds, 300, 300, 0.25)).toBe('center')
    })

    it('clamps out of bounds coordinates cleanly', () => {
      expect(calculateDropZone(bounds, 50, 300)).toBe('left')
      expect(calculateDropZone(bounds, 600, 300)).toBe('right')
      expect(calculateDropZone(bounds, 300, 50)).toBe('top')
      expect(calculateDropZone(bounds, 300, 600)).toBe('bottom')
    })
  })

  describe('Splitting and Resizing', () => {
    it('splits a group horizontally', () => {
      const layout = createInitialDockLayout([
        { id: 'p1', title: 'Panel 1' },
      ])
      const targetGroup = getAllGroups(layout.root)[0]

      const next = splitGroup(
        layout,
        targetGroup.id,
        { id: 'p2', title: 'Panel 2' },
        'horizontal',
        'second',
        0.5
      )

      expect(next.root?.type).toBe('split')
      const split = next.root as DockSplitNode
      expect(split.direction).toBe('horizontal')
      expect(split.ratio).toBe(0.5)

      const groups = getAllGroups(next.root)
      expect(groups.length).toBe(2)
      expect(groups[0].panels[0].id).toBe('p1')
      expect(groups[1].panels[0].id).toBe('p2')
    })

    it('splits a group vertically', () => {
      const layout = createInitialDockLayout([
        { id: 'p1', title: 'Panel 1' },
      ])
      const targetGroup = getAllGroups(layout.root)[0]

      const next = splitGroup(
        layout,
        targetGroup.id,
        { id: 'p2', title: 'Panel 2' },
        'vertical',
        'first',
        0.3
      )

      const split = next.root as DockSplitNode
      expect(split.direction).toBe('vertical')
      expect(split.ratio).toBe(0.3)
      const groups = getAllGroups(next.root)
      expect(groups[0].panels[0].id).toBe('p2') // 'first' position
      expect(groups[1].panels[0].id).toBe('p1')
    })

    it('resizes split ratios within clamped limits (0.05 .. 0.95)', () => {
      const layout = createInitialDockLayout()
      const rootSplit = layout.root as DockSplitNode

      const resized = resizeSplit(layout, rootSplit.id, 0.4)
      expect((resized.root as DockSplitNode).ratio).toBe(0.4)

      const underflow = resizeSplit(layout, rootSplit.id, -0.2)
      expect((underflow.root as DockSplitNode).ratio).toBe(0.05)

      const overflow = resizeSplit(layout, rootSplit.id, 1.5)
      expect((overflow.root as DockSplitNode).ratio).toBe(0.95)
    })
  })

  describe('Tabs management', () => {
    it('switches active panel in group', () => {
      const layout = createInitialDockLayout([
        { id: 'tab-a', title: 'Tab A' },
        { id: 'tab-b', title: 'Tab B' },
      ])
      const group = getAllGroups(layout.root)[0]
      expect(group.activePanelId).toBe('tab-a')

      const updated = setActivePanel(layout, group.id, 'tab-b')
      const updatedGroup = getAllGroups(updated.root)[0]
      expect(updatedGroup.activePanelId).toBe('tab-b')
    })

    it('reorders tabs via moveTab', () => {
      const layout = createInitialDockLayout([
        { id: 't1', title: '1' },
        { id: 't2', title: '2' },
        { id: 't3', title: '3' },
      ])
      const group = getAllGroups(layout.root)[0]

      const reordered = moveTab(layout, group.id, 0, 2)
      const panels = getAllGroups(reordered.root)[0].panels
      expect(panels.map((p) => p.id)).toEqual(['t2', 't3', 't1'])
    })

    it('adds a panel to a group', () => {
      const layout = createInitialDockLayout([
        { id: 't1', title: '1' },
      ])
      const group = getAllGroups(layout.root)[0]

      const next = addPanelToGroup(layout, group.id, { id: 't2', title: '2' })
      const panels = getAllGroups(next.root)[0].panels
      expect(panels.length).toBe(2)
      expect(panels[1].id).toBe('t2')
      expect(getAllGroups(next.root)[0].activePanelId).toBe('t2')
    })
  })

  describe('Docking drag-and-drop operations', () => {
    it('docks panel to center of target group (merging as tab)', () => {
      // 2 groups
      let state = createInitialDockLayout([{ id: 'p1', title: 'P1' }])
      const g1 = getAllGroups(state.root)[0]
      state = splitGroup(state, g1.id, { id: 'p2', title: 'P2' }, 'horizontal', 'second')

      const groupsBefore = getAllGroups(state.root)
      expect(groupsBefore.length).toBe(2)

      // Dock p2 into g1 center
      const docked = dockPanel(state, 'p2', g1.id, 'center')
      const groupsAfter = getAllGroups(docked.root)
      // Group containing p2 was emptied and pruned, leaving only g1 with both panels
      expect(groupsAfter.length).toBe(1)
      expect(groupsAfter[0].panels.map((p) => p.id)).toEqual(['p1', 'p2'])
      expect(groupsAfter[0].activePanelId).toBe('p2')
    })

    it('docks panel to left edge of target group (creating horizontal split)', () => {
      let state = createInitialDockLayout([
        { id: 'p1', title: 'P1' },
        { id: 'p2', title: 'P2' },
      ])
      const g = getAllGroups(state.root)[0]

      // Dock p2 to left of g
      const docked = dockPanel(state, 'p2', g.id, 'left', 0.4)
      const groups = getAllGroups(docked.root)
      expect(groups.length).toBe(2)
      expect(docked.root?.type).toBe('split')
      const split = docked.root as DockSplitNode
      expect(split.direction).toBe('horizontal')
      expect(split.ratio).toBe(0.4)
      expect((split.first as DockPanelGroupNode).panels[0].id).toBe('p2')
      expect((split.second as DockPanelGroupNode).panels[0].id).toBe('p1')
    })

    it('docks panel to bottom edge of target group (creating vertical split)', () => {
      let state = createInitialDockLayout([
        { id: 'p1', title: 'P1' },
        { id: 'p2', title: 'P2' },
      ])
      const g = getAllGroups(state.root)[0]

      const docked = dockPanel(state, 'p2', g.id, 'bottom', 0.5)
      expect(docked.root?.type).toBe('split')
      const split = docked.root as DockSplitNode
      expect(split.direction).toBe('vertical')
      expect((split.first as DockPanelGroupNode).panels[0].id).toBe('p1')
      expect((split.second as DockPanelGroupNode).panels[0].id).toBe('p2')
    })
  })

  describe('Closing panels and Tree pruning', () => {
    it('closes a panel in a multi-panel group without removing the group', () => {
      const state = createInitialDockLayout([
        { id: 'p1', title: 'P1' },
        { id: 'p2', title: 'P2' },
      ])
      const closed = closePanel(state, 'p1')
      const groups = getAllGroups(closed.root)
      expect(groups.length).toBe(1)
      expect(groups[0].panels.length).toBe(1)
      expect(groups[0].panels[0].id).toBe('p2')
      expect(groups[0].activePanelId).toBe('p2')
    })

    it('prunes empty groups and collapses parent split node', () => {
      let state = createInitialDockLayout([{ id: 'p1', title: 'P1' }])
      const g1 = getAllGroups(state.root)[0]
      state = splitGroup(state, g1.id, { id: 'p2', title: 'P2' }, 'horizontal', 'second')
      expect(state.root?.type).toBe('split')

      // Close p2 -> group 2 becomes empty and parent split collapses to group 1
      const closed = closePanel(state, 'p2')
      expect(closed.root?.type).toBe('group')
      const remainingGroup = closed.root as DockPanelGroupNode
      expect(remainingGroup.panels[0].id).toBe('p1')
    })
  })

  describe('Serialization and Persistence', () => {
    it('round-trips serialize and deserialize perfectly', () => {
      const original = createInitialDockLayout()
      const json = serializeDockLayout(original)
      expect(typeof json).toBe('string')

      const restored = deserializeDockLayout(json)
      expect(getAllPanels(restored.root).length).toBe(getAllPanels(original.root).length)
      expect(getAllGroups(restored.root).length).toBe(getAllGroups(original.root).length)
      expect((restored.root as DockSplitNode).direction).toBe((original.root as DockSplitNode).direction)
    })

    it('handles corrupted JSON by falling back to default layout', () => {
      const fallback = deserializeDockLayout('{ invalid-json')
      expect(fallback.root).not.toBeNull()
      expect(getAllPanels(fallback.root).length).toBeGreaterThanOrEqual(1)
    })

    it('sanitizes ratios during deserialization', () => {
      const state: DockLayoutState = {
        root: {
          id: 'split-1',
          type: 'split',
          direction: 'horizontal',
          ratio: 99.9, // corrupted ratio
          first: {
            id: 'g1',
            type: 'group',
            panels: [{ id: 'p1', title: 'P1' }],
            activePanelId: 'p1',
          },
          second: {
            id: 'g2',
            type: 'group',
            panels: [{ id: 'p2', title: 'P2' }],
            activePanelId: 'p2',
          },
        },
      }
      const json = JSON.stringify(state)
      const deserialized = deserializeDockLayout(json)
      expect((deserialized.root as DockSplitNode).ratio).toBe(0.95) // clamped to 0.95
    })
  })
})
