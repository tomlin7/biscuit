import { ICONS } from "./svgs";
import type { IconDefinition, IconThemeDefinition, ResolvedIcon } from "./types";

function parseViewBox(svg: string): string | undefined {
  const match = svg.match(/viewBox=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

function resolveRef(
  theme: IconThemeDefinition,
  def: IconDefinition | string | undefined,
): ResolvedIcon | null {
  if (!def) return null;
  if (typeof def === "string") {
    if (theme.icons && theme.icons[def]) {
      const icon = theme.icons[def];
      const res: ResolvedIcon = { ...icon };
      if (res.svg && !res.viewBox) {
        res.viewBox = parseViewBox(res.svg);
      }
      return res;
    }
    // Check if it names a standard built-in SVG
    if ((ICONS as Record<string, string>)[def]) {
      return { svg: (ICONS as Record<string, string>)[def] };
    }
    // If string is raw SVG path/tag
    if (def.includes("<") || def.includes("d=")) {
      return {
        svg: def,
        viewBox: parseViewBox(def),
      };
    }
    return null;
  }
  const res: ResolvedIcon = { ...def };
  if (res.svg && !res.viewBox) {
    res.viewBox = parseViewBox(res.svg);
  }
  return res;
}

function basename(pathOrName: string): string {
  const clean = pathOrName.trim().replace(/[/\\]+$/, "");
  if (!clean) return "";
  const lastSlash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  return lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
}

export function resolveIcon(
  theme: IconThemeDefinition,
  name: string,
  kind: "file" | "directory",
  open = false,
): ResolvedIcon {
  if (!theme) {
    return {
      svg: kind === "directory" ? (open ? ICONS.folderOpen : ICONS.folder) : ICONS.fileDefault,
      color: kind === "directory" ? "#dcb67a" : "#94a3b8",
    };
  }

  if (theme.id === "none") {
    return { isNone: true };
  }
  if (theme.id === "classic") {
    return { isBadge: true };
  }

  const safeName = typeof name === "string" ? name : "";
  const base = basename(safeName);
  const lowerBase = base.toLowerCase();
  const lowerFull = safeName.trim().replace(/[/\\]+$/, "").toLowerCase();

  if (kind === "directory") {
    if (open && theme.folderNamesOpen) {
      if (theme.folderNamesOpen[lowerBase]) {
        const res = resolveRef(theme, theme.folderNamesOpen[lowerBase]);
        if (res) return res;
      }
      if (lowerFull && theme.folderNamesOpen[lowerFull]) {
        const res = resolveRef(theme, theme.folderNamesOpen[lowerFull]);
        if (res) return res;
      }
    }
    if (theme.folderNames) {
      if (theme.folderNames[lowerBase]) {
        const res = resolveRef(theme, theme.folderNames[lowerBase]);
        if (res) return res;
      }
      if (lowerFull && theme.folderNames[lowerFull]) {
        const res = resolveRef(theme, theme.folderNames[lowerFull]);
        if (res) return res;
      }
    }
    if (open && theme.defaultFolderOpen) {
      const res = resolveRef(theme, theme.defaultFolderOpen);
      if (res) return res;
    }
    if (theme.defaultFolder) {
      const res = resolveRef(theme, theme.defaultFolder);
      if (res) return res;
    }
    return {
      svg: open ? ICONS.folderOpen : ICONS.folder,
      color: "#dcb67a",
    };
  }

  // Exact file name match (priority over extension)
  if (theme.fileNames) {
    if (theme.fileNames[lowerBase]) {
      const res = resolveRef(theme, theme.fileNames[lowerBase]);
      if (res) return res;
    }
    if (lowerFull && theme.fileNames[lowerFull]) {
      const res = resolveRef(theme, theme.fileNames[lowerFull]);
      if (res) return res;
    }
  }

  // Multi-part and single extensions on base file name
  const parts = lowerBase.split(".");
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      const compound = parts.slice(i).join(".");
      if (theme.fileExtensions && theme.fileExtensions[compound]) {
        const res = resolveRef(theme, theme.fileExtensions[compound]);
        if (res) return res;
      }
    }
  }

  if (parts.length > 1) {
    const ext = parts[parts.length - 1];
    if (theme.fileExtensions && theme.fileExtensions[ext]) {
      const res = resolveRef(theme, theme.fileExtensions[ext]);
      if (res) return res;
    }
  }

  // Default fallback for file
  if (theme.defaultFile) {
    const res = resolveRef(theme, theme.defaultFile);
    if (res) return res;
  }

  return {
    svg: ICONS.fileDefault,
    color: "#94a3b8",
  };
}
