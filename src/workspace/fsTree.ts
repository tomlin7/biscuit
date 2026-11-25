import { readDir, type DirEntry } from "@tauri-apps/plugin-fs";
import { joinPath, shouldSkipDir } from "./path";

export type TreeNode = {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: TreeNode[];
  loaded?: boolean;
};

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    const aDir = a.isDirectory ? 0 : 1;
    const bDir = b.isDirectory ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export async function listDirectory(path: string): Promise<TreeNode[]> {
  const entries = sortEntries(await readDir(path));
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (!entry.name || entry.name === ".DS_Store") continue;
    if (entry.isDirectory && shouldSkipDir(entry.name)) continue;

    const childPath = joinPath(path, entry.name);
    if (entry.isDirectory) {
      nodes.push({
        name: entry.name,
        path: childPath,
        kind: "directory",
        children: [],
        loaded: false,
      });
    } else if (entry.isFile) {
      nodes.push({
        name: entry.name,
        path: childPath,
        kind: "file",
      });
    }
  }

  return nodes;
}
