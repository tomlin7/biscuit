export interface SyntaxToken {
  text: string
  color: string
}

export interface HighlightedLine {
  lineNumber: number
  tokens: SyntaxToken[]
}

const TS_KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var', 'function',
  'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
  'interface', 'type', 'class', 'extends', 'implements', 'new', 'this',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof',
  'as', 'true', 'false', 'null', 'undefined', 'void', 'any', 'never', 'unknown',
])

const RUST_KEYWORDS = new Set([
  'fn', 'let', 'mut', 'pub', 'use', 'mod', 'struct', 'enum', 'impl', 'trait',
  'for', 'while', 'loop', 'match', 'if', 'else', 'return', 'self', 'Self',
  'true', 'false', 'where', 'ref', 'move', 'async', 'await', 'crate', 'super',
])

const PYTHON_KEYWORDS = new Set([
  'def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else',
  'for', 'while', 'in', 'is', 'not', 'and', 'or', 'try', 'except', 'finally',
  'with', 'lambda', 'yield', 'True', 'False', 'None', 'self', 'pass',
])

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'rs':
      return 'rust'
    case 'py':
      return 'python'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    default:
      return 'plaintext'
  }
}

export function highlightLine(line: string, language: string): SyntaxToken[] {
  if (!line) {
    return [{ text: ' ', color: '#d4d4d8' }]
  }

  // Comments
  const trimmed = line.trim()
  if (
    (language === 'typescript' || language === 'javascript' || language === 'rust') &&
    trimmed.startsWith('//')
  ) {
    return [{ text: line, color: '#71717a' }]
  }
  if (language === 'python' && trimmed.startsWith('#')) {
    return [{ text: line, color: '#71717a' }]
  }

  const keywords =
    language === 'rust'
      ? RUST_KEYWORDS
      : language === 'python'
      ? PYTHON_KEYWORDS
      : TS_KEYWORDS

  const tokens: SyntaxToken[] = []
  // Regex pattern matching strings, identifiers, numbers, and symbols
  const regex = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[^\s\w]+|\s+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    const text = match[0]

    if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      // String literal
      tokens.push({ text, color: '#98c379' })
    } else if (/^\d+(?:\.\d+)?$/.test(text)) {
      // Number literal
      tokens.push({ text, color: '#d19a66' })
    } else if (keywords.has(text)) {
      // Keyword
      tokens.push({ text, color: '#e2795b' })
    } else if (/^[A-Z][a-zA-Z0-9_$]*$/.test(text) && (language === 'typescript' || language === 'rust')) {
      // Type identifier / PascalCase
      tokens.push({ text, color: '#e5c07b' })
    } else if (/^[{}\[\](),;.]/.test(text)) {
      // Punctuation
      tokens.push({ text, color: '#a1a1aa' })
    } else if (/^[=+\-*/%&|<>!?:~^]+/.test(text)) {
      // Operator
      tokens.push({ text, color: '#56b6c2' })
    } else {
      // Plain text / variable identifier
      tokens.push({ text, color: '#e4e4e7' })
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, color: '#e4e4e7' }]
}

export function highlightCode(content: string, language: string): HighlightedLine[] {
  const lines = content.split('\n')
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    tokens: highlightLine(line, language),
  }))
}
