import React, { useState } from 'react'
import type { DockSplitDirection } from './types'

export interface DockSplitHandleProps {
  splitId: string
  direction: DockSplitDirection
  onStartResize: (e: any, splitId: string, direction: DockSplitDirection) => void
}

export function DockSplitHandle({
  splitId,
  direction,
  onStartResize,
}: DockSplitHandleProps) {
  const [hovered, setHovered] = useState(false)
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      testId={`dock-handle-${splitId}`}
      onMouseDown={(e: any) => onStartResize(e, splitId, direction)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexShrink: 0,
        pointerEvents: 'auto',
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        width: isHorizontal ? 6 : '100%',
        height: isHorizontal ? '100%' : 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hovered ? '#e2795b40' : '#1e1e20',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: isHorizontal ? 1 : '100%',
          height: isHorizontal ? '100%' : 1,
          backgroundColor: hovered ? '#e2795b' : '#333338',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
