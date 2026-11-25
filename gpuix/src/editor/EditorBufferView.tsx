import React, { useCallback, useMemo, useState } from 'react'
import { Button } from '@gpuix/react'
import { useEditor } from './EditorContext'
import { highlightCode } from './syntax'

export interface EditorBufferViewProps {
  bufferId: string
  path?: string
  readOnly?: boolean
}

export function EditorBufferView({ bufferId, path, readOnly = false }: EditorBufferViewProps) {
  const { buffers, updateBufferContent, saveBuffer, setCursor, openFile } = useEditor()
  const buffer = buffers[bufferId]

  React.useEffect(() => {
    if (!buffer && path) {
      void openFile(path)
    }
  }, [buffer, path, openFile])

  const [interactiveMode, setInteractiveMode] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<string>('')

  const highlightedLines = useMemo(() => {
    if (!buffer) return []
    return highlightCode(buffer.content, buffer.language)
  }, [buffer?.content, buffer?.language])

  const handleSave = useCallback(async () => {
    if (!buffer) return
    const res = await saveBuffer(buffer.id)
    if (res.success) {
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(''), 2500)
    } else {
      setSaveStatus(res.error || 'Save failed')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }, [buffer, saveBuffer])

  if (!buffer) {
    return (
      <div
        testId={`editor-buffer-loading-${bufferId}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: '100%',
          height: '100%',
          backgroundColor: '#18181b',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <text style={{ fontSize: 12, color: '#71717a' }}>Loading buffer...</text>
      </div>
    )
  }

  return (
    <div
      testId={`editor-buffer-${buffer.id}`}
      onKeyDown={(e: any) => {
        // Handle Ctrl+S / Cmd+S save shortcut
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
          e.preventDefault?.()
          e.stopPropagation?.()
          void handleSave()
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#18181b',
        overflow: 'hidden',
        userSelect: 'text',
      }}
    >
      {/* Editor Header / Breadcrumbs Bar */}
      <div
        testId="editor-breadcrumb-bar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 30,
          paddingLeft: 12,
          paddingRight: 8,
          backgroundColor: '#141416',
          borderBottomWidth: 1,
          borderColor: '#27272a',
          flexShrink: 0,
        }}
      >
        {/* Path breadcrumb and dirty status */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <text
            testId="editor-breadcrumb-path"
            style={{ fontSize: 11, color: '#a1a1aa', whiteSpace: 'nowrap' }}
          >
            {buffer.path}
          </text>

          {buffer.dirty && (
            <div
              testId="editor-dirty-indicator"
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#e2795b',
              }}
            />
          )}

          {saveStatus && (
            <text
              testId="editor-save-status"
              style={{ fontSize: 11, color: saveStatus === 'Saved' ? '#34d399' : '#f87171' }}
            >
              {saveStatus}
            </text>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Mode Toggle: View / Edit */}
          <Button
            testId="editor-mode-toggle"
            onClick={() => setInteractiveMode((prev) => !prev)}
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              height: 20,
              borderRadius: 3,
              backgroundColor: interactiveMode ? '#e2795b' : '#27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 10, color: interactiveMode ? '#ffffff' : '#d4d4d8' }}>
              {interactiveMode ? 'Edit Mode' : 'Syntax View'}
            </text>
          </Button>

          {/* Save Button */}
          {!readOnly && (
            <Button
              testId="editor-save-btn"
              onClick={() => void handleSave()}
              style={{
                paddingLeft: 8,
                paddingRight: 8,
                height: 20,
                borderRadius: 3,
                backgroundColor: buffer.dirty ? '#e2795b' : '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text
                style={{
                  fontSize: 10,
                  fontWeight: buffer.dirty ? 'bold' : 'normal',
                  color: buffer.dirty ? '#ffffff' : '#d4d4d8',
                }}
              >
                Save
              </text>
            </Button>
          )}

          {/* Line/Col and Language indicator */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingLeft: 6,
              borderLeftWidth: 1,
              borderColor: '#27272a',
            }}
          >
            <text
              testId="editor-cursor-pos"
              style={{ fontSize: 10, color: '#71717a', whiteSpace: 'nowrap' }}
            >
              {`Ln ${buffer.cursorLine}, Col ${buffer.cursorCol}`}
            </text>
            <text
              testId="editor-language-badge"
              style={{ fontSize: 10, color: '#e2795b' }}
            >
              {buffer.language.charAt(0).toUpperCase() + buffer.language.slice(1)}
            </text>
          </div>
        </div>
      </div>

      {/* Editor Surface */}
      <div
        testId="editor-surface-body"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexGrow: 1,
          width: '100%',
          height: '100%',
          backgroundColor: '#121214',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {interactiveMode ? (
          // Interactive Monospace Textarea for editing
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              width: '100%',
              height: '100%',
              padding: 12,
            }}
          >
            <textarea
              testId="editor-interactive-textarea"
              value={buffer.content}
              onChange={(e: any) => updateBufferContent(buffer.id, e.target?.value ?? '')}
              style={{
                flexGrow: 1,
                width: '100%',
                height: '100%',
                backgroundColor: '#121214',
                color: '#f4f4f5',
                fontSize: 12,
                lineHeight: 18,
                padding: 8,
                borderWidth: 0,
              }}
            />
          </div>
        ) : (
          // Line-numbered syntax view
          <div
            testId="editor-syntax-view"
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexGrow: 1,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Line Numbers Gutter */}
            <div
              testId="editor-line-numbers"
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 44,
                flexShrink: 0,
                backgroundColor: '#141416',
                borderRightWidth: 1,
                borderColor: '#27272a',
                paddingTop: 8,
                paddingBottom: 8,
                paddingRight: 8,
                userSelect: 'none',
              }}
            >
              {highlightedLines.map((line) => {
                const isCurrent = line.lineNumber === buffer.cursorLine
                return (
                  <div
                    key={`line-num-${line.lineNumber}`}
                    style={{
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <text
                      style={{
                        fontSize: 11,
                        color: isCurrent ? '#f4f4f5' : '#52525b',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                      }}
                    >
                      {String(line.lineNumber)}
                    </text>
                  </div>
                )
              })}
            </div>

            {/* Code Lines Surface */}
            <div
              testId="editor-code-lines"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 12,
                paddingRight: 12,
                overflow: 'hidden',
              }}
            >
              {highlightedLines.map((line) => {
                const isCurrent = line.lineNumber === buffer.cursorLine
                return (
                  <div
                    key={`code-line-${line.lineNumber}`}
                    testId={`editor-line-${line.lineNumber}`}
                    onClick={() => setCursor(buffer.id, line.lineNumber, 1)}
                    style={{
                      height: 18,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isCurrent ? '#1a1a22' : 'transparent',
                      paddingLeft: 4,
                      paddingRight: 4,
                      borderRadius: 2,
                      cursor: 'text',
                    }}
                  >
                    {line.tokens.map((token, tokIdx) => (
                      <text
                        key={`tok-${line.lineNumber}-${tokIdx}`}
                        style={{
                          fontSize: 12,
                          color: token.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {token.text}
                      </text>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
