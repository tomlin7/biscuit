/**
 * GPUIX Command Palette and Quick Open Types
 */

export type PaletteMode = 'commands' | 'files'

export interface CommandItem {
  id: string
  title: string
  category?: string
  shortcut?: string
  description?: string
  icon?: string
  run: () => void | Promise<void>
}

export interface QuickOpenFileItem {
  path: string
  name: string
  relativePath?: string
  isDirectory?: boolean
}

export interface FuzzyMatchResult {
  matches: boolean
  score: number
  matchedIndices?: number[]
}
