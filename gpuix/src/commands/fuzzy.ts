import type { FuzzyMatchResult } from './types'

/**
 * Fuzzy matcher for commands and file paths.
 * Checks if all query characters appear sequentially in target (case-insensitive).
 * Higher score indicates better match:
 * - Exact match: highest score
 * - Prefix match: high score
 * - Boundary matches (after /, -, _, .): bonus score
 * - Consecutive character matches: bonus score
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  const q = query.trim().toLowerCase()
  const t = target.toLowerCase()

  if (q.length === 0) {
    return { matches: true, score: 0 }
  }

  // Exact match bonus
  if (t === q) {
    return { matches: true, score: 1000 }
  }

  // Exact substring match bonus
  const subIndex = t.indexOf(q)
  if (subIndex !== -1) {
    const isPrefix = subIndex === 0
    return {
      matches: true,
      score: 500 + (isPrefix ? 200 : 0) - subIndex,
    }
  }

  // Sequential subsequence matching
  let qIdx = 0
  let score = 0
  let prevMatchIdx = -2
  const matchedIndices: number[] = []

  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      matchedIndices.push(tIdx)
      let charScore = 10

      // Bonus for consecutive matched characters
      if (tIdx === prevMatchIdx + 1) {
        charScore += 20
      }

      // Bonus for matching at word boundary or path boundary
      if (tIdx === 0 || t[tIdx - 1] === '/' || t[tIdx - 1] === '\\' || t[tIdx - 1] === '-' || t[tIdx - 1] === '_' || t[tIdx - 1] === '.') {
        charScore += 30
      }

      score += charScore
      prevMatchIdx = tIdx
      qIdx++
    }
  }

  const allMatched = qIdx === q.length
  if (!allMatched) {
    return { matches: false, score: -1 }
  }

  return {
    matches: true,
    score,
    matchedIndices,
  }
}

/**
 * Filter and sort an array of items by fuzzy matching against a field.
 */
export function filterAndRank<T>(
  items: T[],
  query: string,
  getText: (item: T) => string
): T[] {
  if (!query.trim()) return items

  const scored: { item: T; score: number }[] = []

  for (const item of items) {
    const text = getText(item)
    const result = fuzzyMatch(query, text)
    if (result.matches) {
      scored.push({ item, score: result.score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
}
