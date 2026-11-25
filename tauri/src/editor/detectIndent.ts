/** Detect indent from the first indented lines of a buffer. */
export function detectIndentFromText(
  text: string,
): { tabSize: number; insertSpaces: boolean } | null {
  const lines = text.split(/\r?\n/).slice(0, 400);
  let tabIndents = 0;
  let spaceIndents = 0;
  const spaceWidths: number[] = [];

  for (const line of lines) {
    if (!line || !line.trim()) continue;
    if (line.startsWith("\t")) {
      tabIndents += 1;
      continue;
    }
    const match = /^( +)/.exec(line);
    if (!match) continue;
    const width = match[1].length;
    if (width === 0) continue;
    spaceIndents += 1;
    spaceWidths.push(width);
  }

  if (tabIndents === 0 && spaceIndents === 0) return null;
  if (tabIndents > spaceIndents) {
    return { tabSize: 4, insertSpaces: false };
  }

  const scores = new Map<number, number>();
  for (const width of spaceWidths) {
    for (const size of [2, 4, 8, 3]) {
      if (width % size === 0) {
        scores.set(size, (scores.get(size) ?? 0) + 1);
      }
    }
  }
  let best = 2;
  let bestScore = -1;
  for (const [size, score] of scores) {
    if (score > bestScore || (score === bestScore && size < best)) {
      best = size;
      bestScore = score;
    }
  }
  return { tabSize: best, insertSpaces: true };
}
