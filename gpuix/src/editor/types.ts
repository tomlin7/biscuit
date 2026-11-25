export interface EditorBuffer {
  id: string
  path: string
  title: string
  content: string
  originalContent: string
  dirty: boolean
  language: string
  cursorLine: number
  cursorCol: number
  scrollOffset?: number
  readOnly?: boolean
}

export interface EditorSaveResult {
  success: boolean
  error?: string
}

export interface EditorContextValue {
  buffers: Record<string, EditorBuffer>
  activeBufferId: string | null
  openFile: (path: string, initialContent?: string) => Promise<EditorBuffer>
  closeBuffer: (bufferId: string) => void
  updateBufferContent: (bufferId: string, newContent: string) => void
  saveBuffer: (bufferId: string) => Promise<EditorSaveResult>
  setCursor: (bufferId: string, line: number, col: number) => void
  setActiveBufferId: (bufferId: string | null) => void
  createUntitledBuffer: (content?: string) => EditorBuffer
}
