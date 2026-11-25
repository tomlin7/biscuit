import React from 'react'
import type { StatusBarProps } from './types'

export function StatusBar({
  branch = 'main',
  workspaceName,
  cursorLine,
  cursorCol,
  language,
  encoding = 'UTF-8',
  lineEnding = 'LF',
  indentation = 'Spaces: 2',
  errorCount = 0,
  warningCount = 0,
  onBranchClick,
  onLanguageClick,
  onLineColClick,
}: StatusBarProps) {
  const formattedLanguage = language
    ? language.charAt(0).toUpperCase() + language.slice(1)
    : undefined

  return (
    <div
      testId="bottom-status-bar"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
        width: '100%',
        backgroundColor: '#141416',
        borderTopWidth: 1,
        borderColor: '#27272a',
        paddingLeft: 10,
        paddingRight: 10,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left items: Branch, Workspace, Diagnostics */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Git branch item */}
        <div
          testId="status-git-branch"
          onClick={() => onBranchClick?.()}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            cursor: onBranchClick ? 'pointer' : 'default',
          }}
        >
          <text style={{ fontSize: 11, color: '#e2795b' }}>⎇</text>
          <text style={{ fontSize: 11, color: '#f4f4f5' }}>{branch}</text>
        </div>

        {/* Workspace Name */}
        {workspaceName && (
          <div
            testId="status-workspace-name"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <text style={{ fontSize: 11, color: '#71717a' }}>{workspaceName}</text>
          </div>
        )}

        {/* Diagnostics: Errors & Warnings */}
        <div
          testId="status-diagnostics"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <text style={{ fontSize: 10, color: errorCount > 0 ? '#ef4444' : '#71717a' }}>✕</text>
            <text style={{ fontSize: 10, color: errorCount > 0 ? '#ef4444' : '#71717a' }}>
              {String(errorCount)}
            </text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <text style={{ fontSize: 10, color: warningCount > 0 ? '#f59e0b' : '#71717a' }}>⚠</text>
            <text style={{ fontSize: 10, color: warningCount > 0 ? '#f59e0b' : '#71717a' }}>
              {String(warningCount)}
            </text>
          </div>
        </div>
      </div>

      {/* Right items: Cursor metrics, Indentation, Encoding, Line Endings, Language */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Cursor Line & Column */}
        {typeof cursorLine === 'number' && typeof cursorCol === 'number' && (
          <div
            testId="status-cursor-metrics"
            onClick={() => onLineColClick?.()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              cursor: onLineColClick ? 'pointer' : 'default',
            }}
          >
            <text style={{ fontSize: 11, color: '#a1a1aa' }}>
              {`Ln ${cursorLine}, Col ${cursorCol}`}
            </text>
          </div>
        )}

        {/* Indentation */}
        <div
          testId="status-indentation"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <text style={{ fontSize: 11, color: '#71717a' }}>{indentation}</text>
        </div>

        {/* Encoding */}
        <div
          testId="status-encoding"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <text style={{ fontSize: 11, color: '#71717a' }}>{encoding}</text>
        </div>

        {/* Line Endings */}
        <div
          testId="status-line-ending"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <text style={{ fontSize: 11, color: '#71717a' }}>{lineEnding}</text>
        </div>

        {/* Language Mode */}
        {formattedLanguage && (
          <div
            testId="status-language"
            onClick={() => onLanguageClick?.()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              cursor: onLanguageClick ? 'pointer' : 'default',
            }}
          >
            <text style={{ fontSize: 11, color: '#e2795b' }}>{formattedLanguage}</text>
          </div>
        )}
      </div>
    </div>
  )
}
