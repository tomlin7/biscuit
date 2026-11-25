/**
 * GPUIX Status Bar Types
 */

export interface StatusBarProps {
  branch?: string
  workspaceName?: string
  cursorLine?: number
  cursorCol?: number
  language?: string
  encoding?: string
  lineEnding?: 'LF' | 'CRLF'
  indentation?: string
  errorCount?: number
  warningCount?: number
  onBranchClick?: () => void
  onLanguageClick?: () => void
  onLineColClick?: () => void
}
