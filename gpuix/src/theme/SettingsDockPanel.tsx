import React from 'react'
import { Button } from '@gpuix/react'
import { useTheme } from './ThemeContext'

export function SettingsDockPanel() {
  const { theme, setTheme, settings, updateSettings, tokens } = useTheme()

  return (
    <div
      testId="dock-panel-settings"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        height: '100%',
        backgroundColor: tokens.bgSurface,
        padding: 20,
        overflow: 'hidden',
        userSelect: 'none',
        gap: 20,
      }}
    >
      {/* Settings Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: tokens.border,
        }}
      >
        <text style={{ fontSize: 16, fontWeight: 'bold', color: tokens.textPrimary }}>
          Preferences & Settings
        </text>
        <text style={{ fontSize: 12, color: tokens.textMuted }}>
          Customize editor visual theme tokens, font metrics, and layout options
        </text>
      </div>

      {/* Settings Form Items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 480,
        }}
      >
        {/* 1. Theme Mode */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <text style={{ fontSize: 13, fontWeight: 'bold', color: tokens.textPrimary }}>
              Color Theme
            </text>
            <text style={{ fontSize: 11, color: tokens.textMuted }}>
              Select between dark and light appearance
            </text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
            <Button
              testId="settings-theme-dark-btn"
              onClick={() => setTheme('dark')}
              style={{
                height: 26,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                backgroundColor: theme === 'dark' ? tokens.accent : tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: theme === 'dark' ? '#ffffff' : tokens.textPrimary }}>
                Dark
              </text>
            </Button>

            <Button
              testId="settings-theme-light-btn"
              onClick={() => setTheme('light')}
              style={{
                height: 26,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                backgroundColor: theme === 'light' ? tokens.accent : tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: theme === 'light' ? '#ffffff' : tokens.textPrimary }}>
                Light
              </text>
            </Button>
          </div>
        </div>

        {/* 2. Editor Font Size */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <text style={{ fontSize: 13, fontWeight: 'bold', color: tokens.textPrimary }}>
              Font Size
            </text>
            <text style={{ fontSize: 11, color: tokens.textMuted }}>
              Editor line height and text dimension in pixels
            </text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button
              testId="settings-font-size-minus"
              onClick={() => updateSettings({ fontSize: Math.max(8, settings.fontSize - 1) })}
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                backgroundColor: tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 12, color: tokens.textPrimary }}>−</text>
            </Button>

            <text testId="settings-font-size-val" style={{ fontSize: 12, color: tokens.textPrimary, minWidth: 20 }}>
              {String(settings.fontSize)}
            </text>

            <Button
              testId="settings-font-size-plus"
              onClick={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                backgroundColor: tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 12, color: tokens.textPrimary }}>+</text>
            </Button>
          </div>
        </div>

        {/* 3. Tab Indentation Size */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <text style={{ fontSize: 13, fontWeight: 'bold', color: tokens.textPrimary }}>
              Tab Size
            </text>
            <text style={{ fontSize: 11, color: tokens.textMuted }}>
              Number of spaces per indentation level
            </text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
            <Button
              testId="settings-tab-size-2"
              onClick={() => updateSettings({ tabSize: 2 })}
              style={{
                height: 26,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                backgroundColor: settings.tabSize === 2 ? tokens.accent : tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: settings.tabSize === 2 ? '#ffffff' : tokens.textPrimary }}>
                2 Spaces
              </text>
            </Button>

            <Button
              testId="settings-tab-size-4"
              onClick={() => updateSettings({ tabSize: 4 })}
              style={{
                height: 26,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 4,
                backgroundColor: settings.tabSize === 4 ? tokens.accent : tokens.itemActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <text style={{ fontSize: 11, color: settings.tabSize === 4 ? '#ffffff' : tokens.textPrimary }}>
                4 Spaces
              </text>
            </Button>
          </div>
        </div>

        {/* 4. Word Wrap */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <text style={{ fontSize: 13, fontWeight: 'bold', color: tokens.textPrimary }}>
              Word Wrap
            </text>
            <text style={{ fontSize: 11, color: tokens.textMuted }}>
              Wrap lines that exceed the viewport width
            </text>
          </div>

          <Button
            testId="settings-word-wrap-toggle"
            onClick={() => updateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
            style={{
              height: 26,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 4,
              backgroundColor: settings.wordWrap === 'on' ? tokens.accent : tokens.itemActive,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 11, color: settings.wordWrap === 'on' ? '#ffffff' : tokens.textPrimary }}>
              {settings.wordWrap === 'on' ? 'On' : 'Off'}
            </text>
          </Button>
        </div>

        {/* 5. Line Numbers */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <text style={{ fontSize: 13, fontWeight: 'bold', color: tokens.textPrimary }}>
              Line Numbers Gutter
            </text>
            <text style={{ fontSize: 11, color: tokens.textMuted }}>
              Show gutter line numbers in editor buffers
            </text>
          </div>

          <Button
            testId="settings-line-numbers-toggle"
            onClick={() => updateSettings({ lineNumbers: settings.lineNumbers === 'on' ? 'off' : 'on' })}
            style={{
              height: 26,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 4,
              backgroundColor: settings.lineNumbers === 'on' ? tokens.accent : tokens.itemActive,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <text style={{ fontSize: 11, color: settings.lineNumbers === 'on' ? '#ffffff' : tokens.textPrimary }}>
              {settings.lineNumbers === 'on' ? 'On' : 'Off'}
            </text>
          </Button>
        </div>
      </div>
    </div>
  )
}
