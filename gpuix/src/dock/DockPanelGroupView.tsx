import React, { useState } from 'react'
import { Button } from '@gpuix/react'
import type { DockDropZone, DockPanel, DockPanelGroupNode } from './types'
import { DockDropOverlay } from './DockDropOverlay'

export interface DockPanelGroupViewProps {
  group: DockPanelGroupNode
  isActiveGroup: boolean
  onSelectGroup: (groupId: string) => void
  onSelectTab: (groupId: string, panelId: string) => void
  onCloseTab: (panelId: string) => void
  onAddTab: (groupId: string) => void
  onStartDragTab: (e: any, panel: DockPanel, groupId: string) => void
  onSplitHorizontal?: (groupId: string) => void
  onSplitVertical?: (groupId: string) => void
  isDragHovered?: boolean
  dragHoverZone?: DockDropZone
  onHoverZone?: (zone: DockDropZone) => void
  onSelectZone?: (zone: DockDropZone) => void
  onMoveTab?: (groupId: string, fromIndex: number, toIndex: number) => void
  renderPanel?: (panel: DockPanel, group: DockPanelGroupNode) => React.ReactNode
  renderEmptyGroup?: (group: DockPanelGroupNode, onAddTab: (groupId: string) => void) => React.ReactNode
}

export function DockPanelGroupView({
  group,
  isActiveGroup,
  onSelectGroup,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onStartDragTab,
  onSplitHorizontal,
  onSplitVertical,
  isDragHovered = false,
  dragHoverZone,
  onHoverZone,
  onSelectZone,
  onMoveTab,
  renderPanel,
  renderEmptyGroup,
}: DockPanelGroupViewProps) {
  const [hoveredCloseId, setHoveredCloseId] = useState<string | null>(null)
  const activePanel =
    group.panels.find((p) => p.id === group.activePanelId) ?? group.panels[0]

  return (
    <div
      testId={`dock-group-${group.id}`}
      onClick={() => onSelectGroup(group.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 60,
        minHeight: 60,
        position: 'relative',
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: isActiveGroup ? '#3b3b44' : '#27272a',
        overflow: 'hidden',
      }}
    >
      {/* Group Tab Bar Header */}
      <div
        testId={`dock-group-header-${group.id}`}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 32,
          backgroundColor: '#141416',
          borderBottomWidth: 1,
          borderColor: '#27272a',
          paddingLeft: 4,
          paddingRight: 4,
          gap: 2,
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Tabs */}
        <div
          testId={`dock-group-tabs-${group.id}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          {group.panels.map((panel) => {
            const isActive = panel.id === activePanel?.id
            return (
              <div
                key={panel.id}
                testId={`dock-tab-${panel.id}`}
                onClick={(e: any) => {
                  e.stopPropagation?.()
                  onSelectTab(group.id, panel.id)
                }}
                onMouseDown={(e: any) => {
                  if (hoveredCloseId === panel.id) return
                  onStartDragTab(e, panel, group.id)
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 26,
                  paddingLeft: 10,
                  paddingRight: panel.closable !== false ? 6 : 10,
                  backgroundColor: isActive ? '#222226' : '#18181b',
                  borderTopWidth: isActive ? 2 : 0,
                  borderColor: '#e2795b',
                  borderRadius: 3,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                <text
                  testId={`dock-tab-title-${panel.id}`}
                  style={{
                    fontSize: 12,
                    color: isActive ? '#f4f4f5' : '#a1a1aa',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {panel.title}
                </text>

                {panel.closable !== false && (
                  <div
                    testId={`dock-tab-close-${panel.id}`}
                    onClick={(e: any) => {
                      e.stopPropagation?.()
                      onCloseTab(panel.id)
                    }}
                    onMouseEnter={() => setHoveredCloseId(panel.id)}
                    onMouseLeave={() => setHoveredCloseId(null)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        hoveredCloseId === panel.id ? '#3f3f46' : 'transparent',
                    }}
                  >
                    <text
                      style={{
                        fontSize: 10,
                        color:
                          hoveredCloseId === panel.id ? '#ffffff' : '#71717a',
                        lineHeight: 10,
                      }}
                    >
                      ✕
                    </text>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Group Header Actions */}
        <div
          testId={`dock-group-actions-${group.id}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Button
            testId={`dock-tab-add-${group.id}`}
            onClick={(e: any) => {
              e.stopPropagation?.()
              onAddTab(group.id)
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 3,
              backgroundColor: '#1f1f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 13 }}>+</text>
          </Button>

          {onSplitHorizontal && (
            <Button
              testId={`dock-split-h-btn-${group.id}`}
              onClick={(e: any) => {
                e.stopPropagation?.()
                onSplitHorizontal(group.id)
              }}
              style={{
                height: 22,
                paddingLeft: 5,
                paddingRight: 5,
                borderRadius: 3,
                backgroundColor: '#1f1f23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>Split H</text>
            </Button>
          )}

          {onSplitVertical && (
            <Button
              testId={`dock-split-v-btn-${group.id}`}
              onClick={(e: any) => {
                e.stopPropagation?.()
                onSplitVertical(group.id)
              }}
              style={{
                height: 22,
                paddingLeft: 5,
                paddingRight: 5,
                borderRadius: 3,
                backgroundColor: '#1f1f23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 10, color: '#a1a1aa' }}>Split V</text>
            </Button>
          )}
        </div>
      </div>

      {/* Panel Content Body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {activePanel ? (
          renderPanel ? (
            renderPanel(activePanel, group)
          ) : (
            <div
              testId={`dock-panel-${activePanel.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                gap: 10,
                backgroundColor: '#18181b',
              }}
            >
              <div
                testId={`dock-panel-content-${activePanel.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#27272a',
                  borderRadius: 6,
                  backgroundColor: '#1f1f23',
                }}
              >
                <text
                  style={{
                    fontSize: 14,
                    color: '#f4f4f5',
                    fontWeight: 'bold',
                  }}
                >
                  {activePanel.title}
                </text>
                <text
                  style={{
                    fontSize: 11,
                    color: '#71717a',
                  }}
                >
                  ID: {activePanel.id}
                </text>
                <text
                  style={{
                    fontSize: 11,
                    color: '#a1a1aa',
                    marginTop: 4,
                  }}
                >
                  Drag tab header to split or dock into another group
                </text>
              </div>
            </div>
          )
        ) : renderEmptyGroup ? (
          renderEmptyGroup(group, onAddTab)
        ) : (
          <div
            style={{
              display: 'flex',
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#18181b',
            }}
          >
            <text style={{ fontSize: 12, color: '#71717a' }}>No active panels</text>
          </div>
        )}

        {/* Drop zone overlay when dragging over this panel group */}
        {isDragHovered && (
          <DockDropOverlay
            groupId={group.id}
            activeZone={dragHoverZone}
            onHoverZone={onHoverZone}
            onSelectZone={onSelectZone}
          />
        )}
      </div>
    </div>
  )
}
