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
  return symbols.filter((s) => s.depth === target.depth);
}
