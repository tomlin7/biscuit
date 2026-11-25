import { convertFileSrc } from "@tauri-apps/api/core";
import { resolveHtmlAsset } from "./htmlAssets";

const IMG_SRC = /(\bsrc\s*=\s*)(["'])([^"']*)\2/gi;

export function rewriteMarkdownImages(html: string, filePath: string): string {
  return html.replace(IMG_SRC, (full, attr: string, quote: string, url: string) => {
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
