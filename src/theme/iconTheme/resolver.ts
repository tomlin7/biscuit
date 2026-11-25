import { ICONS } from "./svgs";
import type { IconDefinition, IconThemeDefinition, ResolvedIcon } from "./types";

function resolveRef(
  theme: IconThemeDefinition,
  def: IconDefinition | string | undefined,
): ResolvedIcon | null {
  if (!def) return null;
  if (typeof def === "string") {
    if (theme.icons && theme.icons[def]) {
      return { ...theme.icons[def] };
    }
    // If string is raw SVG path/tag
    if (def.includes("<") || def.includes("d=")) {
      return { svg: def };
    }
    return null;
  }
  return { ...def };
}

export function resolveIcon(
  theme: IconThemeDefinition,
  name: string,
  kind: "file" | "directory",
  open = false,
): ResolvedIcon {
  if (theme.id === "none") {
    return { isNone: true };
  }
  if (theme.id === "classic") {
    return { isBadge: true };
  }

  const lower = name.toLowerCase().trim();

  if (kind === "directory") {
    if (open && theme.folderNamesOpen && theme.folderNamesOpen[lower]) {
      const res = resolveRef(theme, theme.folderNamesOpen[lower]);
      if (res) return res;
    }
    if (theme.folderNames && theme.folderNames[lower]) {
      const res = resolveRef(theme, theme.folderNames[lower]);
      if (res) return res;
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

  // Exact file name match (e.g. "package.json", "dockerfile")
  if (theme.fileNames && theme.fileNames[lower]) {
    const res = resolveRef(theme, theme.fileNames[lower]);
    if (res) return res;
  }

  // Compound and single extensions
  const parts = lower.split(".");
  if (parts.length > 2) {
    const compound = parts.slice(parts.length - 2).join(".");
    if (theme.fileExtensions && theme.fileExtensions[compound]) {
      const res = resolveRef(theme, theme.fileExtensions[compound]);
      if (res) return res;
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
