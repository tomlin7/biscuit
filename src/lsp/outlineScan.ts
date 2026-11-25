export type OutlineSymbol = {
  name: string;
  kind: string;
  line: number;
  depth: number;
};

const CODE_PATTERNS: Array<[RegExp, string]> = [
  [/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/, "function"],
  [/^(?:export\s+)?class\s+(\w+)/, "class"],
  [/^(?:export\s+)?interface\s+(\w+)/, "interface"],
  [/^(?:export\s+)?type\s+(\w+)/, "type"],
  [/^(?:export\s+)?enum\s+(\w+)/, "enum"],
  [/^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/, "function"],
  [/^(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)/, "struct"],
  [/^(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)/, "enum"],
  [/^(?:pub(?:\([^)]*\))?\s+)?trait\s+(\w+)/, "trait"],
  [/^(?:async\s+)?def\s+(\w+)/, "function"],
  [/^class\s+(\w+)/, "class"],
];

export function scanOutline(text: string, language: string): OutlineSymbol[] {
  const lines = text.split(/\r?\n/);
  const out: OutlineSymbol[] = [];
  if (language === "markdown" || language === "md") {
    lines.forEach((line, index) => {
      const match = /^(#{1,6})\s+(.+)$/.exec(line);
      if (!match) return;
      out.push({
        name: match[2].trim(),
        kind: "heading",
        line: index + 1,
        depth: match[1].length - 1,
      });
    });
    return out;
  }
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return;
    for (const [pattern, kind] of CODE_PATTERNS) {
      const match = pattern.exec(trimmed);
      if (!match?.[1]) continue;
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      out.push({
        name: match[1],
        kind,
        line: index + 1,
        depth: Math.min(6, Math.floor(indent / 2)),
      });
      break;
    }
  });
  return out;
}
