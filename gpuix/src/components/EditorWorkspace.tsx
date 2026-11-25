import React, { useMemo, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'

const ink = '#E2E2E2'
const muted = '#A3A3A3'
const dim = '#7D7D7D'
const border = '#292929'
const cardBg = '#1E1E1E'
const activeTabBg = '#252528'
const accent = '#E2795B'

export interface EditorTab {
  id: string
  path: string
  name: string
  content: string
  language?: string
  dirty?: boolean
}

const DEFAULT_TABS: EditorTab[] = [
  {
    id: 'tab-1',
    path: 'gpuix/app.tsx',
    name: 'app.tsx',
    content: `// Morsel GPUIX Editor\nimport { render } from '@gpuix/react'\nimport { MorselApp } from './app'\n\nrender(<MorselApp />, {\n  title: 'Morsel · GPUIX Code Editor',\n  titlebarTransparent: true,\n})\n`,
    language: 'tsx',
    dirty: false,
  },
  {
    id: 'tab-2',
    path: 'gpuix/package.json',
    name: 'package.json',
    content: `{\n  "name": "morsel-gpuix",\n  "version": "0.1.0",\n  "description": "GPU-accelerated code editor rendered with GPUIX"\n}\n`,
    language: 'json',
    dirty: false,
  },
]

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'TypeScript'
    case 'js':
    case 'jsx':
      return 'JavaScript'
    case 'rs':
      return 'Rust'
    case 'py':
      return 'Python'
    case 'json':
      return 'JSON'
    case 'md':
      return 'Markdown'
    case 'html':
      return 'HTML'
    case 'css':
      return 'CSS'
    default:
      return 'Plain Text'
  }
}

export function EditorWorkspace({
  engine,
  onOpenFile,
}: {
  engine?: EngineHandle
  onOpenFile?: (path: string) => void
}) {
  const [tabs, setTabs] = useState<EditorTab[]>(DEFAULT_TABS)
  const [activeTabId, setActiveTabId] = useState<string>('tab-1')
  const [saveStatus, setSaveStatus] = useState<string>('')

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  )

  const lineCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.split(/\r?\n/).length
  }, [activeTab?.content])

  const charCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.length
  }, [activeTab?.content])

  const handleCloseTab = (id: string, e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    const remaining = tabs.filter((t) => t.id !== id)
    setTabs(remaining)
    if (activeTabId === id && remaining.length > 0) {
      setActiveTabId(remaining[remaining.length - 1].id)
    }
  }

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      path: `untitled-${tabs.length + 1}.ts`,
      name: `Untitled-${tabs.length + 1}.ts`,
      content: '// New scratchpad buffer\nconsole.log("Hello from Morsel GPUIX");\n',
      language: 'ts',
      dirty: true,
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newId)
  }

  const handleSave = () => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, dirty: false } : t)),
    )
    setSaveStatus('Saved buffer')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  return (
    <div
      testId="morsel-editor-workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        backgroundColor: '#181818',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar header */}
      <div
        testId="editor-tabs-bar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 38,
          backgroundColor: '#141414',
          borderBottomWidth: 1,
          borderColor: border,
          paddingLeft: 8,
          paddingRight: 8,
          gap: 2,
          overflowX: 'scroll',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <Button
              key={tab.id}
              testId={`editor-tab-${tab.id}`}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                height: 30,
                paddingLeft: 10,
                paddingRight: 8,
                borderRadius: 6,
                backgroundColor: isActive ? activeTabBg : '#1b1b1d',
                borderWidth: 1,
                borderColor: isActive ? accent : '#2a2a2a',
                gap: 6,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <text
                style={{
                  fontSize: 12,
                  color: isActive ? ink : muted,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.dirty ? `${tab.name} *` : tab.name}
              </text>
              <Button
                testId={`close-tab-${tab.id}`}
                onClick={(e: any) => handleCloseTab(tab.id, e)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#00000000',
                  hover: { backgroundColor: '#ffffff20' },
                  cursor: 'pointer',
                }}
              >
                <text style={{ fontSize: 11, color: dim, whiteSpace: 'nowrap' }}>{'x'}</text>
              </Button>
            </Button>
          )
        })}

        <Button
          testId="editor-new-tab"
          onClick={handleNewTab}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#202024',
            cursor: 'pointer',
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          <text style={{ fontSize: 13, color: muted, whiteSpace: 'nowrap' }}>{'+'}</text>
        </Button>
      </div>

      {/* Breadcrumb & Action bar */}
      {activeTab && (
        <div
          testId="editor-breadcrumb-bar"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 30,
            paddingLeft: 12,
            paddingRight: 12,
            backgroundColor: '#1a1a1c',
            borderBottomWidth: 1,
            borderColor: border,
            gap: 8,
            flexShrink: 0,
          }}
        >
          <text
            testId="editor-active-path"
            style={{ fontSize: 11, color: muted, flexGrow: 1, whiteSpace: 'nowrap' }}
          >
            {`workspace / ${activeTab.path}`}
          </text>

          {saveStatus && (
            <text style={{ fontSize: 11, color: '#34d399', whiteSpace: 'nowrap' }}>
              {saveStatus}
            </text>
          )}

          <Button
            testId="editor-save-button"
            onClick={handleSave}
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              height: 22,
              borderRadius: 4,
              backgroundColor: '#2c2c30',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 11, color: ink, whiteSpace: 'nowrap' }}>{'Save'}</text>
          </Button>

          <text
            testId="editor-language-badge"
            style={{ fontSize: 11, color: accent, whiteSpace: 'nowrap' }}
          >
            {detectLanguage(activeTab.path)}
          </text>
        </div>
      )}

      {/* Editor Main Content */}
      {activeTab ? (
        <div
          testId="editor-code-container"
          style={{
            flexGrow: 1,
            minHeight: 0,
            padding: 12,
            overflowY: 'scroll',
            backgroundColor: '#161616',
          }}
        >
          <code
            testId="editor-code-view"
            code={activeTab.content}
            path={activeTab.path}
            showLineNumbers
            style={{ fontSize: 13, color: ink }}
          />
        </div>
      ) : (
        <div
          testId="editor-empty-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            gap: 12,
            backgroundColor: '#161616',
          }}
        >
          <text style={{ fontSize: 18, color: ink, fontWeight: 600 }}>
            {'Morsel GPUIX Editor'}
          </text>
          <text style={{ fontSize: 12, color: muted }}>
            {'No editor tabs open. Click below or open a file from the workspace.'}
          </text>
          <Button
            testId="editor-empty-new-tab"
            onClick={handleNewTab}
            style={{
              paddingLeft: 12,
              paddingRight: 12,
              height: 32,
              borderRadius: 6,
              backgroundColor: accent,
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 12, color: '#17181c', fontWeight: 600 }}>
              {'New Buffer'}
            </text>
          </Button>
        </div>
      )}

      {/* Status Bar */}
      <div
        testId="morsel-status-bar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: 26,
          backgroundColor: '#121214',
          borderTopWidth: 1,
          borderColor: border,
          paddingLeft: 12,
          paddingRight: 12,
          gap: 14,
          flexShrink: 0,
        }}
      >
        <text style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>
          {'branch: main'}
        </text>
        <text style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>
          {'0 problems'}
        </text>
        <div style={{ flexGrow: 1 }} />
        {activeTab && (
          <text
            testId="status-bar-metrics"
            style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}
          >
            {`Ln ${lineCount}, Col 1 (${charCount} chars)`}
          </text>
        )}
        <text style={{ fontSize: 11, color: dim, whiteSpace: 'nowrap' }}>
          {'UTF-8'}
        </text>
        <text style={{ fontSize: 11, color: accent, whiteSpace: 'nowrap' }}>
          {'GPUIX v0.1.0'}
        </text>
      </div>
    </div>
  )
}
