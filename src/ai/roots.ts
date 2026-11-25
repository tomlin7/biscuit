import { pathInsideRoot } from "./workspacePath";

export function pathInsideRoots(roots: string[], input: string): string | null {
  for (const root of roots) {
    if (!root) continue;
    const hit = pathInsideRoot(root, input);
    if (hit) return hit;
  }
  return null;
}

export function rootForPath(roots: string[], filePath: string): string | null {
  const key = filePath.replace(/\\/g, "/").toLowerCase();
  for (const root of roots) {
    const rootKey = root.replace(/[\\/]+$/, "").replace(/\\/g, "/").toLowerCase();
    if (key === rootKey || key.startsWith(`${rootKey}/`)) return root;
  }
  return roots[0] ?? null;
}
