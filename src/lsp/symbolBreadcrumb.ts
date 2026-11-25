import type { OutlineSymbol } from "./outlineScan";

/**
 * Returns the chain of nested symbol scopes that enclose the given cursorLine.
 * Symbols must be ordered by line number.
 * Example: if Class Foo is at line 10 (depth 0) and Method bar is at line 20 (depth 1),
 * cursorLine 25 returns [Foo, bar].
 */
export function getActiveSymbolPath(
  symbols: OutlineSymbol[] | undefined | null,
  cursorLine: number,
): OutlineSymbol[] {
  if (!symbols || symbols.length === 0 || cursorLine < 1) return [];

  const stack: OutlineSymbol[] = [];
  for (const sym of symbols) {
    if (sym.line > cursorLine) break;
    // Pop any symbols that are at the same or deeper depth than the current symbol
    while (stack.length > 0 && stack[stack.length - 1].depth >= sym.depth) {
      stack.pop();
    }
    stack.push(sym);
  }

  return stack;
}

/**
 * Returns sibling symbols that share the same parent depth and scope as the target symbol.
 */
export function getSiblingSymbols(
  symbols: OutlineSymbol[] | undefined | null,
  target: OutlineSymbol,
): OutlineSymbol[] {
  if (!symbols || symbols.length === 0) return [];

  const targetIndex = symbols.findIndex(
    (s) => s.line === target.line && s.name === target.name && s.depth === target.depth,
  );
  if (targetIndex === -1) {
    return symbols.filter((s) => s.depth === target.depth);
  }

  if (target.depth === 0) {
    return symbols.filter((s) => s.depth === 0);
  }

  // Find parent symbol: the nearest preceding symbol with depth < target.depth
  let parentIndex = -1;
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (symbols[i].depth < target.depth) {
      parentIndex = i;
      break;
    }
  }

  const parentDepth = parentIndex >= 0 ? symbols[parentIndex].depth : target.depth - 1;
  const startIndex = parentIndex >= 0 ? parentIndex + 1 : 0;
  let endIndex = symbols.length;

  for (let i = targetIndex + 1; i < symbols.length; i++) {
    if (symbols[i].depth <= parentDepth) {
      endIndex = i;
      break;
    }
  }

  return symbols.slice(startIndex, endIndex).filter((s) => s.depth === target.depth);
}
