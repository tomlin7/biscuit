import type { ThemeMode, ThemeTokens } from './types'

export const darkThemeTokens: ThemeTokens = {
  bgApp: '#121214',
  bgSurface: '#18181b',
  bgHeader: '#161618',
  bgSubheader: '#141416',
  border: '#27272a',
  accent: '#e2795b',
  textPrimary: '#f4f4f5',
  textMuted: '#a1a1aa',
  itemHover: '#222226',
  itemActive: '#27272a',
}

export const lightThemeTokens: ThemeTokens = {
  bgApp: '#f4f4f5',
  bgSurface: '#ffffff',
  bgHeader: '#e4e4e7',
  bgSubheader: '#f0f0f2',
  border: '#d4d4d8',
  accent: '#e2795b',
  textPrimary: '#18181b',
  textMuted: '#71717a',
  itemHover: '#e4e4e7',
  itemActive: '#d4d4d8',
}

export function getThemeTokens(mode: ThemeMode): ThemeTokens {
  return mode === 'light' ? lightThemeTokens : darkThemeTokens
}
