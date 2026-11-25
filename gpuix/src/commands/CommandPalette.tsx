import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommandItem, PaletteMode, QuickOpenFileItem } from './types'
import { filterAndRank } from './fuzzy'

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  mode?: PaletteMode
  commands?: CommandItem[]
  files?: QuickOpenFileItem[]
  onSelectFile?: (file: QuickOpenFileItem) => void
  initialQuery?: string
  placeholder?: string
}

export function CommandPalette({
  open,
  onClose,
  mode = 'commands',
  commands = [],
  files = [],
  onSelectFile,
  initialQuery = '',
  placeholder,
}: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset query and selected index on open
  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setSelectedIndex(0)
    }
  }, [open, initialQuery, mode])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Filter commands or files using fuzzy matcher
  const filteredCommands = useMemo(() => {
    if (mode !== 'commands') return []
    return filterAndRank(commands, query, (cmd) =>
      cmd.category ? `${cmd.category}: ${cmd.title}` : cmd.title
    )
  }, [mode, commands, query])

  const filteredFiles = useMemo(() => {
    if (mode !== 'files') return []
    return filterAndRank(files, query, (file) =>
      `${file.name} ${file.relativePath ?? file.path}`
    )
  }, [mode, files, query])

  const itemCount = mode === 'commands' ? filteredCommands.length : filteredFiles.length

  const handleSelectCurrent = useCallback(() => {
    if (mode === 'commands') {
      const selected = filteredCommands[selectedIndex]
      if (selected) {
        onClose()
        void selected.run()
      }
    } else {
      const selected = filteredFiles[selectedIndex]
      if (selected) {
        onClose()
        onSelectFile?.(selected)
      }
    }
  }, [mode, filteredCommands, filteredFiles, selectedIndex, onClose, onSelectFile])

  const handleKeyDown = useCallback(
    (e: any) => {
      if (e.key === 'Escape') {
        e.preventDefault?.()
        e.stopPropagation?.()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault?.()
        e.stopPropagation?.()
        setSelectedIndex((curr) => Math.min(curr + 1, Math.max(itemCount - 1, 0)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault?.()
        e.stopPropagation?.()
        setSelectedIndex((curr) => Math.max(curr - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault?.()
        e.stopPropagation?.()
        handleSelectCurrent()
      }
    },
    [itemCount, handleSelectCurrent, onClose]
  )

  if (!open) return null

  const defaultPlaceholder =
    mode === 'files'
      ? 'Search files by name (Ctrl+P)...'
      : 'Type a command or action (Ctrl+Shift+P)...'

  return (
    <div
      testId="command-palette-overlay"
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 64,
        backgroundColor: '#00000088',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Clickable backdrop dismiss area */}
      <div
        testId="command-palette-backdrop"
        onClick={() => onClose()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Centered Palette Dialog Panel */}
      <div
        testId="command-palette-dialog"
        onClick={(e: any) => e.stopPropagation?.()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 580,
          maxHeight: 440,
          backgroundColor: '#18181b',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#27272a',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            paddingLeft: 14,
            paddingRight: 14,
            borderBottomWidth: 1,
            borderColor: '#27272a',
            backgroundColor: '#161618',
            gap: 10,
          }}
        >
          <text style={{ fontSize: 13, color: '#e2795b' }}>
            {mode === 'files' ? '📄' : '⚡'}
          </text>
          <input
            testId="command-palette-input"
            value={query}
            onChange={(e: any) => setQuery(e.target?.value ?? '')}
            placeholder={placeholder ?? defaultPlaceholder}
            style={{
              flexGrow: 1,
              height: 28,
              fontSize: 13,
              color: '#f4f4f5',
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingLeft: 2,
              paddingRight: 2,
            }}
          />
          <text style={{ fontSize: 10, color: '#71717a' }}>
            Esc to dismiss
          </text>
        </div>

        {/* Results List */}
        <div
          testId="command-palette-results"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            maxHeight: 380,
            overflow: 'hidden',
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {itemCount === 0 ? (
            <div
              testId="command-palette-empty"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <text style={{ fontSize: 12, color: '#71717a' }}>
                {mode === 'files' ? 'No matching files found' : 'No matching commands found'}
              </text>
            </div>
          ) : mode === 'commands' ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={cmd.id}
                  testId={`command-palette-item-${cmd.id}`}
                  onClick={() => {
                    onClose()
                    void cmd.run()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 32,
                    paddingLeft: 14,
                    paddingRight: 14,
                    backgroundColor: isSelected ? '#27272a' : 'transparent',
                    borderLeftWidth: isSelected ? 3 : 0,
                    borderColor: '#e2795b',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {cmd.category && (
                      <text style={{ fontSize: 12, color: '#a1a1aa' }}>
                        {`${cmd.category}:`}
                      </text>
                    )}
                    <text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 'bold' : 'normal',
                        color: isSelected ? '#f4f4f5' : '#d4d4d8',
                      }}
                    >
                      {cmd.title}
                    </text>
                  </div>

                  {cmd.shortcut && (
                    <div
                      style={{
                        paddingLeft: 6,
                        paddingRight: 6,
                        height: 18,
                        borderRadius: 3,
                        backgroundColor: '#1f1f23',
                        borderWidth: 1,
                        borderColor: '#2f2f35',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <text style={{ fontSize: 10, color: '#a1a1aa' }}>
                        {cmd.shortcut}
                      </text>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={file.path}
                  testId={`quick-open-item-${idx}`}
                  onClick={() => {
                    onClose()
                    onSelectFile?.(file)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 32,
                    paddingLeft: 14,
                    paddingRight: 14,
                    backgroundColor: isSelected ? '#27272a' : 'transparent',
                    borderLeftWidth: isSelected ? 3 : 0,
                    borderColor: '#e2795b',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <text style={{ fontSize: 11, color: '#e2795b' }}>
                      {file.isDirectory ? '📁' : '📄'}
                    </text>
                    <text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 'bold' : 'normal',
                        color: isSelected ? '#f4f4f5' : '#d4d4d8',
                      }}
                    >
                      {file.name}
                    </text>
                  </div>

                  <text
                    style={{
                      fontSize: 11,
                      color: '#71717a',
                      maxWidth: 240,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.relativePath ?? file.path}
                  </text>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
