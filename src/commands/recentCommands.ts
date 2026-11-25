const KEY = "t3d.recentCommands";
const MAX = 8;

export function readRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberCommandId(id: string) {
  if (!id || id.startsWith("symbol:") || id.startsWith("wsym:") || id.startsWith("file:") || id.startsWith("recent.") || id.startsWith("kb:")) {
    return;
  }
  const next = [id, ...readRecentCommandIds().filter((item) => item !== id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
