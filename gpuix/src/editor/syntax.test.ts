import { describe, expect, it } from 'vitest'
import { detectLanguage, highlightCode, highlightLine } from './syntax'

describe('syntax highlighter', () => {
  it('detects language from file extensions', () => {
    expect(detectLanguage('main.ts')).toBe('typescript')
    expect(detectLanguage('app.tsx')).toBe('typescript')
    expect(detectLanguage('index.js')).toBe('javascript')
    expect(detectLanguage('lib.rs')).toBe('rust')
    expect(detectLanguage('script.py')).toBe('python')
    expect(detectLanguage('data.json')).toBe('json')
    expect(detectLanguage('README.md')).toBe('markdown')
    expect(detectLanguage('styles.css')).toBe('css')
    expect(detectLanguage('LICENSE')).toBe('plaintext')
  })

  it('tokenizes keywords, strings, and operators', () => {
    const tokens = highlightLine('const name: string = "morsel";', 'typescript')
    const texts = tokens.map((t) => t.text)
    expect(texts).toContain('const')
    expect(texts).toContain('"morsel"')

    const constToken = tokens.find((t) => t.text === 'const')
    expect(constToken?.color).toBe('#e2795b')

    const stringToken = tokens.find((t) => t.text === '"morsel"')
    expect(stringToken?.color).toBe('#98c379')
  })

  it('handles single line comments', () => {
    const tokens = highlightLine('// this is a comment', 'typescript')
    expect(tokens.length).toBe(1)
    expect(tokens[0].color).toBe('#71717a')
  })

  it('splits and numbers multiple code lines accurately', () => {
    const code = 'fn main() {\n    let x = 42;\n}'
    const lines = highlightCode(code, 'rust')
    expect(lines.length).toBe(3)
    expect(lines[0].lineNumber).toBe(1)
    expect(lines[1].lineNumber).toBe(2)
    expect(lines[2].lineNumber).toBe(3)
  })
})
