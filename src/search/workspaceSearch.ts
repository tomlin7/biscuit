import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { basename, isProbablyTextFile, joinPath, shouldSkipDir } from "../workspace/path";

export type SearchHit = {
  path: string;
  line: number;
  column: number;
  preview: string;
};

export type TextSearchOptions = {
  matchCase: boolean;
  useRegex: boolean;
};

export const defaultSearchOptions: TextSearchOptions = {
  matchCase: true,
  useRegex: false,
};

function searchPattern(query: string, options: TextSearchOptions): RegExp {
  const source = options.useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(source, options.matchCase ? "g" : "gi");
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
}

export function hitsInText(
  text: string,
  query: string,
  options: TextSearchOptions,
): Omit<SearchHit, "path">[] {
  const pattern = searchPattern(query, options);
  const lines = text.split(/\r?\n/);
  const hits: Omit<SearchHit, "path">[] = [];
  for (let i = 0; i < lines.length; i++) {
    pattern.lastIndex = 0;
    const match = pattern.exec(lines[i]);
    if (!match || match.index === undefined) continue;
    hits.push({
      line: i + 1,
      column: match.index + 1,
      preview: lines[i].trim().slice(0, 160),
    });
  }
  return hits;
}

export function replaceInText(
  text: string,
  query: string,
  replacement: string,
  options: TextSearchOptions,
): { next: string; count: number } {
  const pattern = searchPattern(query, options);
  const matches = text.match(pattern);
  if (!matches || matches.length === 0) return { next: text, count: 0 };
  pattern.lastIndex = 0;
  return { next: text.replace(pattern, replacement), count: matches.length };
}

const MAX_HITS = 200;
const MAX_FILE_BYTES = 512_000;

export async function searchWorkspace(
  rootPath: string,
  query: string,
  options: TextSearchOptions = defaultSearchOptions,
): Promise<SearchHit[]> {
  const needle = query.trim();
  if (!needle) return [];
  searchPattern(needle, options);

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
        for (const hit of hitsInText(text, needle, options)) {
          hits.push({ path, ...hit });
          if (hits.length >= MAX_HITS) return hits;
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  return hits;
}

export async function countReplaceInWorkspace(
  rootPath: string,
  query: string,
  replacement: string,
  dirtyPaths: ReadonlySet<string>,
  options: TextSearchOptions = defaultSearchOptions,
): Promise<{ files: number; replacements: number; skippedDirty: number }> {
  const needle = query.trim();
  if (!needle) return { files: 0, replacements: 0, skippedDirty: 0 };
  searchPattern(needle, options);

  let files = 0;
  let replacements = 0;
  let skippedDirty = 0;
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
        if (text.length > MAX_FILE_BYTES) continue;
        const replaced = replaceInText(text, needle, replacement, options);
        if (replaced.count === 0) continue;
        files += 1;
        replacements += replaced.count;
      } catch {
        /* skip unreadable */
      }
    }
  }

  return { files, replacements, skippedDirty };
}

export async function replaceInWorkspace(
  rootPath: string,
  query: string,
  replacement: string,
  dirtyPaths: ReadonlySet<string>,
  options: TextSearchOptions = defaultSearchOptions,
): Promise<{ files: number; replacements: number; skippedDirty: number; paths: string[] }> {
  const needle = query.trim();
  if (!needle) return { files: 0, replacements: 0, skippedDirty: 0, paths: [] };
  searchPattern(needle, options);

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
        if (text.length > MAX_FILE_BYTES) continue;
        const replaced = replaceInText(text, needle, replacement, options);
        if (replaced.count === 0) continue;
        await writeTextFile(path, replaced.next);
        files += 1;
        replacements += replaced.count;
        paths.push(path);
      } catch {
        /* skip unreadable */
      }
    }
  }

  return { files, replacements, skippedDirty, paths };
}

const MAX_FILE_INDEX = 2500;

export async function listWorkspaceFiles(roots: string[]): Promise<string[]> {
  const files: string[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (!root) continue;
    const queue = [root];
    while (queue.length > 0 && files.length < MAX_FILE_INDEX) {
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
        if (!entry.isFile) continue;
        const key = path.replace(/\\/g, "/").toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        files.push(path);
        if (files.length >= MAX_FILE_INDEX) return files;
      }
    }
  }
  return files;
}

export function hitLabel(path: string): string {
  return basename(path);
}
