import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { basename, isProbablyTextFile, joinPath, shouldSkipDir } from "../workspace/path";

export type SearchHit = {
  path: string;
  line: number;
  column: number;
  preview: string;
};

const MAX_HITS = 200;
const MAX_FILE_BYTES = 512_000;

export async function searchWorkspace(
  rootPath: string,
  query: string,
): Promise<SearchHit[]> {
  const needle = query.trim();
  if (!needle) return [];

  const hits: SearchHit[] = [];
  const queue = [rootPath];

  while (queue.length > 0 && hits.length < MAX_HITS) {
    const dir = queue.shift()!;
    let entries;
    try {
      entries = await readDir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.name || entry.name === ".DS_Store") continue;
      const path = joinPath(dir, entry.name);

      if (entry.isDirectory) {
        if (!shouldSkipDir(entry.name)) queue.push(path);
        continue;
      }
      if (!entry.isFile || !isProbablyTextFile(path)) continue;

      try {
        const text = await readTextFile(path);
        if (text.length > MAX_FILE_BYTES) continue;
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          const column = lineText.indexOf(needle);
          if (column < 0) continue;
          hits.push({
            path,
            line: i + 1,
            column: column + 1,
            preview: lineText.trim().slice(0, 160),
          });
          if (hits.length >= MAX_HITS) {
            return hits;
          }
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  return hits;
}

export function hitLabel(path: string): string {
  return basename(path);
}
