import React from 'react'
import { DockContainer } from '../dock/DockContainer'
import type { DockLayoutState } from '../dock/types'
import type { EngineHandle } from '../engine/use-engine'

export interface DockWorkspaceProps {
  engine?: EngineHandle
  initialLayout?: DockLayoutState
  onLayoutChange?: (layout: DockLayoutState) => void
}

export function DockWorkspace({
  engine,
  initialLayout,
  onLayoutChange,
}: DockWorkspaceProps) {
  return (
    <div
      testId="dock-workspace-surface"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#121214',
        overflow: 'hidden',
      }}
    >
      <DockContainer
        initialLayout={initialLayout}
        onLayoutChange={onLayoutChange}
        showControls={true}
      />
    </div>
  )
}
