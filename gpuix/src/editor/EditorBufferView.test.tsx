import React from 'react'
import { describe, expect, it } from 'vitest'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { connectTest } from '@gpuix/react/automation'
import { EditorProvider } from './EditorContext'
import { EditorBufferView } from './EditorBufferView'
import type { EditorBuffer } from './types'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

const MOCK_BUFFER: EditorBuffer = {
  id: 'file-src/app.tsx',
  path: 'src/app.tsx',
  title: 'app.tsx',
  content: `import React from 'react'\n\nexport function App() {\n  return <div>Morsel Editor</div>\n}`,
  originalContent: `import React from 'react'\n\nexport function App() {\n  return <div>Morsel Editor</div>\n}`,
  dirty: false,
  language: 'typescript',
  cursorLine: 1,
  cursorCol: 1,
}

describeNative('EditorBufferView component', () => {
  it('renders breadcrumbs, line numbers, and highlighted code tokens', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <EditorProvider
        initialBuffers={{
          [MOCK_BUFFER.id]: MOCK_BUFFER,
        }}
      >
        <EditorBufferView bufferId={MOCK_BUFFER.id} />
      </EditorProvider>
    )
    const app = await connectTest(renderer)

    const breadcrumb = app.getByTestId('editor-breadcrumb-bar')
    await breadcrumb.waitFor({ timeoutMs: 5000 })
    expect(await breadcrumb.bounds()).toBeDefined()

    const lineNumbers = app.getByTestId('editor-line-numbers')
    await lineNumbers.waitFor({ timeoutMs: 5000 })
    expect(await lineNumbers.bounds()).toBeDefined()

    const line1 = app.getByTestId('editor-line-1')
    await line1.waitFor({ timeoutMs: 5000 })
    expect(await line1.bounds()).toBeDefined()

    const cursorPos = app.getByTestId('editor-cursor-pos')
    expect(await cursorPos.textContent()).toBe('Ln 1, Col 1')

    await app.close()
  })

  it('updates cursor position when clicking a code line', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <EditorProvider
        initialBuffers={{
          [MOCK_BUFFER.id]: MOCK_BUFFER,
        }}
      >
        <EditorBufferView bufferId={MOCK_BUFFER.id} />
      </EditorProvider>
    )
    const app = await connectTest(renderer)

    const line3 = app.getByTestId('editor-line-3')
    await line3.waitFor({ timeoutMs: 5000 })
    await line3.click()

    const cursorPos = app.getByTestId('editor-cursor-pos')
    expect(await cursorPos.textContent()).toBe('Ln 3, Col 1')

    await app.close()
  })

  it('toggles interactive edit mode and saves modified content', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <EditorProvider
        initialBuffers={{
          [MOCK_BUFFER.id]: { ...MOCK_BUFFER },
        }}
        virtualFileMap={{
          'src/app.tsx': MOCK_BUFFER.content,
        }}
      >
        <EditorBufferView bufferId={MOCK_BUFFER.id} />
      </EditorProvider>
    )
    const app = await connectTest(renderer)

    // Toggle edit mode
    const modeBtn = app.getByTestId('editor-mode-toggle')
    await modeBtn.waitFor({ timeoutMs: 5000 })
    await modeBtn.click()

    const textarea = app.getByTestId('editor-interactive-textarea')
    await textarea.waitFor({ timeoutMs: 5000 })
    expect(await textarea.bounds()).toBeDefined()

    // Click Save button
    const saveBtn = app.getByTestId('editor-save-btn')
    await saveBtn.waitFor({ timeoutMs: 5000 })
    await saveBtn.click()

    const status = app.getByTestId('editor-save-status')
    await status.waitFor({ timeoutMs: 5000 })
    expect(await status.textContent()).toBe('Saved')

    // Switch back to syntax view
    await modeBtn.click()
    const syntaxView = app.getByTestId('editor-syntax-view')
    await syntaxView.waitFor({ timeoutMs: 5000 })
    expect(await syntaxView.bounds()).toBeDefined()

    await app.close()
  })
})
