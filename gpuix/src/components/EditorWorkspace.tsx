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
  initialFile,
}: {
  engine?: EngineHandle
  onOpenFile?: (path: string) => void
  initialFile?: string
}) {
  const [tabs, setTabs] = useState<EditorTab[]>(DEFAULT_TABS)
  const [activeTabId, setActiveTabId] = useState<string>('tab-1')
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [errorStatus, setErrorStatus] = useState<string>('')
  const [editingMode, setEditingMode] = useState<boolean>(false)
  const [quickOpenOpen, setQuickOpenOpen] = useState<boolean>(false)
  const [quickOpenPath, setQuickOpenPath] = useState<string>('')

  // Dynamically load initialFile if supplied
  React.useEffect(() => {
    if (!initialFile) return
    let active = true
    const cleanPath = initialFile.replace(/^workspace[\\/]/, '')
    if (engine?.workspaceFile) {
      engine.workspaceFile(cleanPath).then((wf) => {
        if (!active || !wf || wf.binary) return
        const tabId = `file-${wf.path}`
        setTabs((prev) => {
          const found = prev.find((t) => t.path === wf.path)
          if (found) {
            return prev.map((t) => (t.path === wf.path ? { ...t, content: wf.text } : t))
          }
          return [
            ...prev,
            {
              id: tabId,
              path: wf.path,
              name: wf.path.split(/[\\/]/).pop() ?? wf.path,
              content: wf.text,
              language: detectLanguage(wf.path),
              dirty: false,
            },
          ]
        })
        setActiveTabId(tabId)
      }).catch((err) => {
        if (active) {
          setErrorStatus(err instanceof Error ? err.message : String(err))
          setTimeout(() => setErrorStatus(''), 3000)
        }
      })
    }
    return () => {
      active = false
    }
  }, [initialFile, engine?.workspaceFile])

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

  const handleContentChange = (newContent: string) => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, content: newContent, dirty: true } : t)),
    )
  }

  const handleQuickOpenLoad = async () => {
    if (!quickOpenPath.trim()) return
    const target = quickOpenPath.trim().replace(/^workspace[\\/]/, '')
    if (engine?.workspaceFile) {
      try {
        const wf = await engine.workspaceFile(target)
        if (wf.binary) {
          setErrorStatus('Cannot open binary file')
          setTimeout(() => setErrorStatus(''), 3000)
          return
        }
        const tabId = `file-${wf.path}`
        setTabs((prev) => {
          const found = prev.find((t) => t.path === wf.path)
          if (found) return prev
          return [
            ...prev,
            {
              id: tabId,
              path: wf.path,
              name: wf.path.split(/[\\/]/).pop() ?? wf.path,
              content: wf.text,
              language: detectLanguage(wf.path),
              dirty: false,
            },
          ]
        })
        setActiveTabId(tabId)
        setQuickOpenOpen(false)
        setQuickOpenPath('')
      } catch (err) {
        setErrorStatus(err instanceof Error ? err.message : String(err))
        setTimeout(() => setErrorStatus(''), 3000)
      }
    } else {
      const tabId = `file-${target}`
      setTabs((prev) => [
        ...prev,
        {
          id: tabId,
          path: target,
          name: target.split(/[\\/]/).pop() ?? target,
          content: `// Scratch buffer: ${target}\n`,
          language: detectLanguage(target),
          dirty: false,
        },
      ])
      setActiveTabId(tabId)
      setQuickOpenOpen(false)
      setQuickOpenPath('')
    }
  }

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

        <div style={{ flexGrow: 1 }} />

        <Button
          testId="editor-quick-open-btn"
          onClick={() => setQuickOpenOpen((v) => !v)}
          style={{
            paddingLeft: 8,
            paddingRight: 8,
            height: 24,
            borderRadius: 5,
            backgroundColor: quickOpenOpen ? accent : '#242428',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <text
            style={{
              fontSize: 11,
              color: quickOpenOpen ? '#17181c' : ink,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {'Open File…'}
          </text>
        </Button>
      </div>

      {/* Quick Open Row */}
      {quickOpenOpen && (
        <div
          testId="editor-quick-open-bar"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 34,
            backgroundColor: '#19191d',
            borderBottomWidth: 1,
            borderColor: border,
            paddingLeft: 10,
            paddingRight: 10,
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            testId="editor-quick-open-input"
            value={quickOpenPath}
            placeholder="Relative path (e.g. gpuix/app.tsx or tauri/package.json)"
            onChange={(e: any) => setQuickOpenPath(e?.value ?? '')}
            onSubmit={handleQuickOpenLoad}
            style={{
              flexGrow: 1,
              height: 24,
              backgroundColor: '#111113',
              borderRadius: 4,
              borderWidth: 1,
              borderColor: border,
              paddingLeft: 8,
              paddingRight: 8,
              fontSize: 11,
              color: ink,
            }}
          />
          <Button
            testId="editor-quick-open-load"
            onClick={handleQuickOpenLoad}
            style={{
              paddingLeft: 10,
              paddingRight: 10,
              height: 24,
              borderRadius: 4,
              backgroundColor: accent,
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 11, color: '#17181c', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {'Load'}
            </text>
          </Button>
          <Button
            testId="editor-quick-open-cancel"
            onClick={() => setQuickOpenOpen(false)}
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              height: 24,
              borderRadius: 4,
              backgroundColor: '#26262a',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>{'Cancel'}</text>
          </Button>
        </div>
      )}

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

          {errorStatus && (
            <text style={{ fontSize: 11, color: '#f87171', whiteSpace: 'nowrap' }}>
              {errorStatus}
            </text>
          )}

          {saveStatus && (
            <text style={{ fontSize: 11, color: '#34d399', whiteSpace: 'nowrap' }}>
              {saveStatus}
            </text>
          )}

          <Button
            testId="editor-mode-toggle"
            onClick={() => setEditingMode((v) => !v)}
            style={{
              paddingLeft: 8,
              paddingRight: 8,
              height: 22,
              borderRadius: 4,
              backgroundColor: editingMode ? '#3a3a42' : '#26262a',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 11, color: ink, whiteSpace: 'nowrap' }}>
              {editingMode ? 'Syntax View' : 'Edit Buffer'}
            </text>
          </Button>

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
        editingMode ? (
          <div
            testId="editor-interactive-container"
            style={{
              flexGrow: 1,
              minHeight: 0,
              padding: 12,
              backgroundColor: '#161616',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <textarea
              testId="editor-interactive-textarea"
              value={activeTab.content}
              onChange={(e: any) => handleContentChange(e?.value ?? '')}
              style={{
                flexGrow: 1,
                minHeight: 0,
                fontSize: 13,
                lineHeight: 18,
                color: ink,
                backgroundColor: '#131313',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: border,
                padding: 10,
              }}
            />
          </div>
        ) : (
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
        )
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
