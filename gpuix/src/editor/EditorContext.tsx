import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { EditorBuffer, EditorContextValue, EditorSaveResult } from './types'
import { detectLanguage } from './syntax'

const EditorContext = createContext<EditorContextValue | null>(null)

export interface EditorProviderProps {
  initialBuffers?: Record<string, EditorBuffer>
  virtualFileMap?: Record<string, string>
  children: React.ReactNode
}

let untitledCounter = 1

export function EditorProvider({
  initialBuffers = {},
  virtualFileMap,
  children,
}: EditorProviderProps) {
  const [buffers, setBuffers] = useState<Record<string, EditorBuffer>>(initialBuffers)
  const [activeBufferId, setActiveBufferId] = useState<string | null>(() => {
    const keys = Object.keys(initialBuffers)
    return keys[0] ?? null
  })

  // Open or load a file into a buffer
  const openFile = useCallback(
    async (path: string, initialContent?: string): Promise<EditorBuffer> => {
      const bufferId = `file-${path}`

      // If buffer already loaded, return existing
      if (buffers[bufferId]) {
        setActiveBufferId(bufferId)
        return buffers[bufferId]
      }

      let content = initialContent ?? ''

      // Check virtual mock map first (useful for testing)
      if (virtualFileMap && typeof virtualFileMap[path] === 'string') {
        content = virtualFileMap[path]
      } else if (initialContent === undefined) {
        // Read from disk via node:fs/promises
        try {
          const fs = await import('node:fs/promises')
          content = await fs.readFile(path, 'utf8')
        } catch {
          // Default empty or preserve fallback
          content = ''
        }
      }

      const filename = path.split('/').pop()?.split('\\').pop() ?? path
      const lang = detectLanguage(path)

      const newBuffer: EditorBuffer = {
        id: bufferId,
        path,
        title: filename,
        content,
        originalContent: content,
        dirty: false,
        language: lang,
        cursorLine: 1,
        cursorCol: 1,
      }

      setBuffers((prev) => ({
        ...prev,
        [bufferId]: newBuffer,
      }))
      setActiveBufferId(bufferId)

      return newBuffer
    },
    [buffers, virtualFileMap]
  )

  const updateBufferContent = useCallback((bufferId: string, newContent: string) => {
    setBuffers((prev) => {
      const buf = prev[bufferId]
      if (!buf) return prev

      return {
        ...prev,
        [bufferId]: {
          ...buf,
          content: newContent,
          dirty: newContent !== buf.originalContent,
        },
      }
    })
  }, [])

  const saveBuffer = useCallback(
    async (bufferId: string): Promise<EditorSaveResult> => {
      const buf = buffers[bufferId]
      if (!buf) {
        return { success: false, error: 'Buffer not found' }
      }

      // If it's a real file path (not untitled), write to disk
      if (!buf.path.startsWith('untitled:')) {
        try {
          const fs = await import('node:fs/promises')
          await fs.writeFile(buf.path, buf.content, 'utf8')
        } catch (err) {
          // If disk write fails and not in a virtual test environment
          if (!virtualFileMap) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }
      }

      // Mark buffer clean
      setBuffers((prev) => {
        const current = prev[bufferId]
        if (!current) return prev
        return {
          ...prev,
          [bufferId]: {
            ...current,
            originalContent: current.content,
            dirty: false,
          },
        }
      })

      return { success: true }
    },
    [buffers, virtualFileMap]
  )

  const closeBuffer = useCallback((bufferId: string) => {
    setBuffers((prev) => {
      const { [bufferId]: _, ...remaining } = prev
      return remaining
    })
    setActiveBufferId((curr) => (curr === bufferId ? null : curr))
  }, [])

  const setCursor = useCallback((bufferId: string, line: number, col: number) => {
    setBuffers((prev) => {
      const buf = prev[bufferId]
      if (!buf) return prev
      return {
        ...prev,
        [bufferId]: {
          ...buf,
          cursorLine: line,
          cursorCol: col,
        },
      }
    })
  }, [])

  const createUntitledBuffer = useCallback((content: string = ''): EditorBuffer => {
    const id = `untitled-${untitledCounter++}`
    const title = `Untitled-${untitledCounter - 1}`
    const newBuf: EditorBuffer = {
      id,
      path: `untitled:${title}`,
      title,
      content,
      originalContent: '',
      dirty: content.length > 0,
      language: 'plaintext',
      cursorLine: 1,
      cursorCol: 1,
    }

    setBuffers((prev) => ({
      ...prev,
      [id]: newBuf,
    }))
    setActiveBufferId(id)

    return newBuf
  }, [])

  const value: EditorContextValue = useMemo(
    () => ({
      buffers,
      activeBufferId,
      openFile,
      closeBuffer,
      updateBufferContent,
      saveBuffer,
      setCursor,
      setActiveBufferId,
      createUntitledBuffer,
    }),
    [
      buffers,
      activeBufferId,
      openFile,
      closeBuffer,
      updateBufferContent,
      saveBuffer,
      setCursor,
      createUntitledBuffer,
    ]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return ctx
}
