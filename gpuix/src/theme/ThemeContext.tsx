import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { EditorSettings, ThemeContextValue, ThemeMode } from './types'
import { getThemeTokens } from './tokens'

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps {
  initialTheme?: ThemeMode
  initialSettings?: Partial<EditorSettings>
  children: React.ReactNode
}

const defaultSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 12,
  tabSize: 2,
  wordWrap: 'off',
  lineNumbers: 'on',
}

export function ThemeProvider({
  initialTheme = 'dark',
  initialSettings,
  children,
}: ThemeProviderProps) {
  const [settings, setSettings] = useState<EditorSettings>(() => ({
    ...defaultSettings,
    ...initialSettings,
    theme: initialTheme,
  }))

  const setTheme = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({
      ...prev,
      theme: mode,
    }))
  }, [])

  const updateSettings = useCallback((partial: Partial<EditorSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
    }))
  }, [])

  const tokens = useMemo(() => getThemeTokens(settings.theme), [settings.theme])

  const value: ThemeContextValue = useMemo(
    () => ({
      tokens,
      theme: settings.theme,
      settings,
      setTheme,
      updateSettings,
    }),
    [tokens, settings, setTheme, updateSettings]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
