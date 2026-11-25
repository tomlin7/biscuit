const FILES_KEY = "t3d.recentFiles";
const FOLDERS_KEY = "t3d.recentFolders";
const CLOSED_KEY = "t3d.closedEditors";
const LIMIT = 15;
const CLOSED_LIMIT = 20;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

function remember(key: string, path: string, limit: number): string[] {
  const next = [path, ...readList(key).filter((item) => item !== path)].slice(0, limit);
  writeList(key, next);
  return next;
}

export function rememberFile(path: string) {
  remember(FILES_KEY, path, LIMIT);
}

export function rememberFolder(path: string) {
  remember(FOLDERS_KEY, path, LIMIT);
}

export function recentFiles(): string[] {
  return readList(FILES_KEY);
}

export function recentFolders(): string[] {
  return readList(FOLDERS_KEY);
}

export function pushClosedEditor(path: string) {
  remember(CLOSED_KEY, path, CLOSED_LIMIT);
}

export function popClosedEditor(): string | null {
  const [next, ...rest] = readList(CLOSED_KEY);
  writeList(CLOSED_KEY, rest);
  return next ?? null;
}
