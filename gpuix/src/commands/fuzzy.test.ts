import { describe, expect, it } from 'vitest'
import { fuzzyMatch, filterAndRank } from './fuzzy'

describe('Command / File Fuzzy Search', () => {
  it('matches exact strings with highest score', () => {
    const res = fuzzyMatch('editor', 'editor')
    expect(res.matches).toBe(true)
    expect(res.score).toBeGreaterThanOrEqual(1000)
  })

  it('matches substring queries', () => {
    const res = fuzzyMatch('buff', 'EditorBufferView.tsx')
    expect(res.matches).toBe(true)
    expect(res.score).toBeGreaterThan(0)
  })

  it('matches sequential subsequences', () => {
    const res = fuzzyMatch('ebv', 'EditorBufferView.tsx')
    expect(res.matches).toBe(true)
    expect(res.matchedIndices?.length).toBe(3)
  })

  it('rejects non-matching queries', () => {
    const res = fuzzyMatch('xyz123', 'EditorBufferView.tsx')
    expect(res.matches).toBe(false)
  })

  it('ranks exact and prefix matches above distant matches', () => {
    const items = ['src/components/Editor.tsx', 'src/editor/index.ts', 'editor.config.json']
    const ranked = filterAndRank(items, 'editor', (item) => item)

    expect(ranked.length).toBe(3)
    // 'editor.config.json' starts with editor, should rank higher than nested paths
    expect(ranked[0]).toBe('editor.config.json')
  })
})
