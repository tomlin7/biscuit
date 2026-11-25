import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
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

export async function replaceInWorkspace(
  rootPath: string,
  query: string,
  replacement: string,
  dirtyPaths: ReadonlySet<string>,
): Promise<{ files: number; replacements: number; skippedDirty: number; paths: string[] }> {
  const needle = query.trim();
  if (!needle) return { files: 0, replacements: 0, skippedDirty: 0, paths: [] };

  let files = 0;
  let replacements = 0;
  let skippedDirty = 0;
  const paths: string[] = [];
  const queue = [rootPath];

  while (queue.length > 0) {
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
      if (dirtyPaths.has(path)) {
        skippedDirty += 1;
        continue;
      }

      try {
        const text = await readTextFile(path);
        if (text.length > MAX_FILE_BYTES || !text.includes(needle)) continue;
        const count = text.split(needle).length - 1;
        await writeTextFile(path, text.split(needle).join(replacement));
        files += 1;
        replacements += count;
        paths.push(path);
      } catch {
        /* skip unreadable */
      }
    }
  }

  return { files, replacements, skippedDirty, paths };
}

export function hitLabel(path: string): string {
  return basename(path);
}
