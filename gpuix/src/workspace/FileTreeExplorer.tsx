import React, { useState } from 'react'
import { Button } from '@gpuix/react'
import { useWorkspace } from './WorkspaceContext'
import type { WorkspaceFileEntry } from './types'

export interface FileTreeExplorerProps {
  onOpenFile?: (path: string, name: string) => void
}

function getFileBadgeColor(extension?: string): { bg: string; text: string } {
  switch (extension) {
    case 'ts':
    case 'tsx':
      return { bg: '#2563eb33', text: '#60a5fa' }
    case 'js':
    case 'jsx':
      return { bg: '#eab30833', text: '#fde047' }
    case 'rs':
      return { bg: '#ea580c33', text: '#fb923c' }
    case 'json':
      return { bg: '#10b98133', text: '#34d399' }
    case 'md':
      return { bg: '#8b5cf633', text: '#c4b5fd' }
    case 'css':
      return { bg: '#ec489933', text: '#f472b6' }
    default:
      return { bg: '#3f3f4633', text: '#a1a1aa' }
  }
}

interface TreeItemRowProps {
  entry: WorkspaceFileEntry
  depth: number
  selectedPath: string | null
  expandedPaths: Record<string, boolean>
  onToggleDirectory: (path: string) => void
  onSelectFile: (path: string) => void
}

function TreeItemRow({
  entry,
  depth,
  selectedPath,
  expandedPaths,
  onToggleDirectory,
  onSelectFile,
}: TreeItemRowProps) {
  const isDir = entry.kind === 'directory'
  const isExpanded = !!expandedPaths[entry.path]
  const isSelected = selectedPath === entry.path
  const [hovered, setHovered] = useState(false)

  const paddingLeft = depth * 14 + 10
  const badge = getFileBadgeColor(entry.extension)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        testId={`explorer-item-${entry.name}`}
        onClick={() => {
          if (isDir) {
            onToggleDirectory(entry.path)
          } else {
            onSelectFile(entry.path)
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 24,
          paddingLeft,
          paddingRight: 8,
          gap: 6,
          backgroundColor: isSelected
            ? '#2d2d34'
            : hovered
            ? '#222226'
            : 'transparent',
          borderLeftWidth: isSelected ? 2 : 0,
          borderColor: '#e2795b',
          cursor: 'pointer',
          userSelect: 'none',
          pointerEvents: 'auto',
          width: '100%',
        }}
      >
        {/* Expand / Collapse Indicator for Folders */}
        {isDir ? (
          <div
            testId={`explorer-chevron-${entry.name}`}
            style={{
              width: 12,
              height: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 9, color: '#a1a1aa', fontWeight: 'bold' }}>
              {isExpanded ? '▾' : '▸'}
            </text>
          </div>
        ) : (
          <div style={{ width: 12, height: 12 }} />
        )}

        {/* Kind Icon or File Extension Badge */}
        {isDir ? (
          <div
            style={{
              width: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 11, color: isExpanded ? '#e2795b' : '#a1a1aa' }}>
              {isExpanded ? '📂' : '📁'}
            </text>
          </div>
        ) : (
          <div
            style={{
              paddingLeft: 3,
              paddingRight: 3,
              height: 14,
              borderRadius: 2,
              backgroundColor: badge.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 9, fontWeight: 'bold', color: badge.text }}>
              {entry.extension ? entry.extension.toUpperCase().slice(0, 3) : 'TXT'}
            </text>
          </div>
        )}

        {/* File / Folder Name */}
        <text
          testId={`explorer-name-${entry.name}`}
          style={{
            fontSize: 12,
            color: isSelected ? '#f4f4f5' : isDir ? '#e4e4e7' : '#d4d4d8',
            whiteSpace: 'nowrap',
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          {entry.name}
        </text>
      </div>

      {/* Render Expanded Children */}
      {isDir && isExpanded && entry.children && entry.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {entry.children.map((child) => (
            <TreeItemRow
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleDirectory={onToggleDirectory}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTreeExplorer({ onOpenFile }: FileTreeExplorerProps) {
  const {
    rootName,
    entries,
    selectedPath,
    expandedPaths,
    isLoading,
    toggleDirectory,
    selectFile,
    createFile,
    createFolder,
    collapseAll,
    refresh,
  } = useWorkspace()

  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null)
  const [newEntryName, setNewEntryName] = useState('')

  const handleSelectFile = (path: string) => {
    selectFile(path)
    const name = path.split('/').pop() ?? path
    onOpenFile?.(path, name)
  }

  const handleCommitCreation = async () => {
    const trimmed = newEntryName.trim()
    if (!trimmed) {
      setCreatingType(null)
      return
    }

    if (creatingType === 'file') {
      await createFile('', trimmed)
    } else if (creatingType === 'folder') {
      await createFolder('', trimmed)
    }

    setNewEntryName('')
    setCreatingType(null)
  }

  return (
    <div
      testId="workspace-file-tree"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#18181b',
        overflow: 'hidden',
      }}
    >
      {/* Explorer Header / Action Bar */}
      <div
        testId="explorer-header"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 32,
          paddingLeft: 12,
          paddingRight: 8,
          backgroundColor: '#141416',
          borderBottomWidth: 1,
          borderColor: '#27272a',
          flexShrink: 0,
        }}
      >
        <text
          testId="explorer-root-name"
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#a1a1aa',
            whiteSpace: 'nowrap',
          }}
        >
          {`EXPLORER: ${rootName.toUpperCase()}`}
        </text>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* New File Button */}
          <Button
            testId="explorer-new-file-btn"
            onClick={() => {
              setCreatingType('file')
              setNewEntryName('')
            }}
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              height: 20,
              backgroundColor: '#27272a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#d4d4d8' }}>+ File</text>
          </Button>

          {/* New Folder Button */}
          <Button
            testId="explorer-new-folder-btn"
            onClick={() => {
              setCreatingType('folder')
              setNewEntryName('')
            }}
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              height: 20,
              backgroundColor: '#27272a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#d4d4d8' }}>+ Folder</text>
          </Button>

          {/* Refresh Button */}
          <Button
            testId="explorer-refresh-btn"
            onClick={() => void refresh()}
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              height: 20,
              backgroundColor: '#27272a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#d4d4d8' }}>↻</text>
          </Button>

          {/* Collapse All Button */}
          <Button
            testId="explorer-collapse-btn"
            onClick={collapseAll}
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              height: 20,
              backgroundColor: '#27272a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#d4d4d8' }}>⇡</text>
          </Button>
        </div>
      </div>

      {/* Inline Create Input Box */}
      {creatingType && (
        <div
          testId="explorer-create-dialog"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 6,
            paddingBottom: 6,
            backgroundColor: '#1f1f23',
            borderBottomWidth: 1,
            borderColor: '#3b3b44',
            gap: 6,
          }}
        >
          <text style={{ fontSize: 11, color: '#e2795b' }}>
            {creatingType === 'file' ? 'New file:' : 'New folder:'}
          </text>

          <input
            testId="explorer-create-input"
            value={newEntryName}
            onChange={(e: any) => setNewEntryName(e.target?.value ?? '')}
            style={{
              flexGrow: 1,
              height: 22,
              backgroundColor: '#121214',
              borderWidth: 1,
              borderColor: '#3f3f46',
              borderRadius: 3,
              paddingLeft: 6,
              fontSize: 11,
              color: '#f4f4f5',
            }}
          />

          <Button
            testId="explorer-create-confirm"
            onClick={() => void handleCommitCreation()}
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              height: 22,
              backgroundColor: '#e2795b',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#ffffff', fontWeight: 'bold' }}>Create</text>
          </Button>

          <Button
            testId="explorer-create-cancel"
            onClick={() => {
              setCreatingType(null)
              setNewEntryName('')
            }}
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              height: 22,
              backgroundColor: '#27272a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: '#a1a1aa' }}>Cancel</text>
          </Button>
        </div>
      )}

      {/* File Tree List Content */}
      <div
        testId="explorer-tree-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'hidden',
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {isLoading && (
          <div style={{ padding: 12 }}>
            <text style={{ fontSize: 11, color: '#71717a' }}>Scanning workspace...</text>
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div
            testId="explorer-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              padding: 24,
              gap: 8,
            }}
          >
            <text style={{ fontSize: 12, color: '#71717a' }}>No files in workspace</text>
            <Button
              testId="explorer-empty-refresh-btn"
              onClick={() => void refresh()}
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                height: 24,
                backgroundColor: '#27272a',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: '#e2795b' }}>Refresh Directory</text>
            </Button>
          </div>
        )}

        {!isLoading &&
          entries.map((entry) => (
            <TreeItemRow
              key={entry.path}
              entry={entry}
              depth={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleDirectory={(p) => void toggleDirectory(p)}
              onSelectFile={handleSelectFile}
            />
          ))}
      </div>
    </div>
  )
}
