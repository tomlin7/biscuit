import { convertFileSrc } from "@tauri-apps/api/core";
import { parentPath } from "../workspace/path";
import { pathInsideRoot } from "../ai/workspacePath";

const ATTR =
  /(\b(?:src|href)\s*=\s*)(["'])([^"']*)\2/gi;

export function resolveHtmlAsset(filePath: string, url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:|asset:|#|\/\/)/i.test(trimmed)) return null;
  if (trimmed.startsWith("https://asset.localhost")) return null;
  const dir = parentPath(filePath);
  if (!dir) return null;
  return pathInsideRoot(dir, trimmed);
}

export function rewriteHtmlAssets(source: string, filePath: string): string {
  return source.replace(ATTR, (full, attr: string, quote: string, url: string) => {
    if (/^(https?:|data:|blob:|asset:|#|\/\/)/i.test(url.trim())) return full;
    const resolved = resolveHtmlAsset(filePath, url);
    if (!resolved) return `${attr}${quote}${quote}`;
    try {
      return `${attr}${quote}${convertFileSrc(resolved)}${quote}`;
    } catch {
      return `${attr}${quote}${quote}`;
    }
  });
}
