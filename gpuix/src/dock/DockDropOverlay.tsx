import React from 'react'
import type { StyleDesc } from '@gpuix/react'
import type { DockDropZone } from './types'

export interface DockDropOverlayProps {
  groupId: string
  activeZone?: DockDropZone
  onSelectZone?: (zone: DockDropZone) => void
}

export function DockDropOverlay({
  groupId,
  activeZone,
  onSelectZone,
}: DockDropOverlayProps) {
  const getPreviewStyle = (): StyleDesc => {
    switch (activeZone) {
      case 'left':
        return {
          position: 'absolute',
          left: 0,
          top: 0,
          width: '50%',
          height: '100%',
          backgroundColor: '#e2795b33',
          borderWidth: 2,
          borderColor: '#e2795b',
          borderRadius: 6,
          pointerEvents: 'none',
        }
      case 'right':
        return {
          position: 'absolute',
          right: 0,
          top: 0,
          width: '50%',
          height: '100%',
          backgroundColor: '#e2795b33',
          borderWidth: 2,
          borderColor: '#e2795b',
          borderRadius: 6,
          pointerEvents: 'none',
        }
      case 'top':
        return {
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '50%',
          backgroundColor: '#e2795b33',
          borderWidth: 2,
          borderColor: '#e2795b',
          borderRadius: 6,
          pointerEvents: 'none',
        }
      case 'bottom':
        return {
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: '50%',
          backgroundColor: '#e2795b33',
          borderWidth: 2,
          borderColor: '#e2795b',
          borderRadius: 6,
          pointerEvents: 'none',
        }
      case 'center':
      default:
        return {
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#e2795b26',
          borderWidth: 2,
          borderColor: '#e2795b',
          borderRadius: 6,
          pointerEvents: 'none',
        }
    }
  }

  return (
    <div
      testId={`dock-drop-overlay-${groupId}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Visual preview for currently hovered dock area */}
      <div testId="dock-drop-preview" style={getPreviewStyle()} />

      {/* Interactive / visual drop zone cross indicators */}
      <div
        style={{
          width: 140,
          height: 140,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        {/* Top Drop Zone */}
        <div
          testId="dock-drop-zone-top"
          onMouseEnter={() => onSelectZone?.('top')}
          onClick={() => onSelectZone?.('top')}
          style={{
            position: 'absolute',
            top: 0,
            left: 45,
            width: 50,
            height: 35,
            backgroundColor: activeZone === 'top' ? '#e2795b' : '#2a2a2e',
            borderWidth: 1,
            borderColor: '#45454d',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <text style={{ fontSize: 10, color: activeZone === 'top' ? '#ffffff' : '#a1a1aa' }}>Top</text>
        </div>

        {/* Bottom Drop Zone */}
        <div
          testId="dock-drop-zone-bottom"
          onMouseEnter={() => onSelectZone?.('bottom')}
          onClick={() => onSelectZone?.('bottom')}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 45,
            width: 50,
            height: 35,
            backgroundColor: activeZone === 'bottom' ? '#e2795b' : '#2a2a2e',
            borderWidth: 1,
            borderColor: '#45454d',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <text style={{ fontSize: 10, color: activeZone === 'bottom' ? '#ffffff' : '#a1a1aa' }}>Bottom</text>
        </div>

        {/* Left Drop Zone */}
        <div
          testId="dock-drop-zone-left"
          onMouseEnter={() => onSelectZone?.('left')}
          onClick={() => onSelectZone?.('left')}
          style={{
            position: 'absolute',
            left: 0,
            top: 45,
            width: 40,
            height: 50,
            backgroundColor: activeZone === 'left' ? '#e2795b' : '#2a2a2e',
            borderWidth: 1,
            borderColor: '#45454d',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <text style={{ fontSize: 10, color: activeZone === 'left' ? '#ffffff' : '#a1a1aa' }}>Left</text>
        </div>

        {/* Right Drop Zone */}
        <div
          testId="dock-drop-zone-right"
          onMouseEnter={() => onSelectZone?.('right')}
          onClick={() => onSelectZone?.('right')}
          style={{
            position: 'absolute',
            right: 0,
            top: 45,
            width: 40,
            height: 50,
            backgroundColor: activeZone === 'right' ? '#e2795b' : '#2a2a2e',
            borderWidth: 1,
            borderColor: '#45454d',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <text style={{ fontSize: 10, color: activeZone === 'right' ? '#ffffff' : '#a1a1aa' }}>Right</text>
        </div>

        {/* Center Drop Zone */}
        <div
          testId="dock-drop-zone-center"
          onMouseEnter={() => onSelectZone?.('center')}
          onClick={() => onSelectZone?.('center')}
          style={{
            position: 'absolute',
            left: 45,
            top: 45,
            width: 50,
            height: 50,
            backgroundColor: activeZone === 'center' ? '#e2795b' : '#323238',
            borderWidth: 1,
            borderColor: '#45454d',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <text style={{ fontSize: 10, color: activeZone === 'center' ? '#ffffff' : '#ffffff' }}>Tab</text>
        </div>
      </div>
    </div>
  )
}
