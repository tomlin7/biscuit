/** Parse a rulers setting like "80, 120" into Monaco column numbers. */
export function parseRulers(raw: string | undefined | null): number[] {
  if (!raw?.trim()) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const n = Number(part);
    if (!Number.isFinite(n) || n < 1 || n > 500) continue;
    const col = Math.round(n);
    if (seen.has(col)) continue;
    seen.add(col);
    out.push(col);
  }
  return out.sort((a, b) => a - b);
}
