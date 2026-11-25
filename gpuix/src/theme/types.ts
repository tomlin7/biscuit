/**
 * GPUIX Visual Theme Tokens and Settings Types
 */

export type ThemeMode = 'dark' | 'light'

export interface ThemeTokens {
  bgApp: string
  bgSurface: string
  bgHeader: string
  bgSubheader: string
  border: string
  accent: string
  textPrimary: string
  textMuted: string
  itemHover: string
  itemActive: string
}

export interface EditorSettings {
  theme: ThemeMode
  fontSize: number
  tabSize: number
  wordWrap: 'on' | 'off'
  lineNumbers: 'on' | 'off'
}

export interface ThemeContextValue {
  tokens: ThemeTokens
  theme: ThemeMode
  settings: EditorSettings
  setTheme: (mode: ThemeMode) => void
  updateSettings: (partial: Partial<EditorSettings>) => void
}
