export type UiTheme = "vs" | "vs-dark";

export interface CustomThemeDefinition {
  id: string;
  label: string;
  uiTheme: UiTheme;
  colors: {
    "editor.background": string;
    "editor.foreground": string;
    "editor.lineHighlightBackground": string;
    "editor.selectionBackground": string;
    "activityBar.background": string;
    "activityBar.foreground": string;
    "sideBar.background": string;
    "sideBar.foreground": string;
    "statusBar.background": string;
    "statusBar.foreground": string;
    accent: string;
    border: string;
    [key: string]: string;
  };
}

export interface ThemeColorSlotInfo {
  key: string;
  label: string;
  description: string;
  category: "editor" | "chrome";
  fallback: string;
}

export const THEME_COLOR_SLOTS: readonly ThemeColorSlotInfo[] = [
  // Editor group
  {
    key: "editor.background",
    label: "Editor Background",
    description: "Main background of the code editor canvas",
    category: "editor",
    fallback: "#141414",
  },
  {
    key: "editor.foreground",
    label: "Editor Foreground",
    description: "Default code text and punctuation color",
    category: "editor",
    fallback: "#e8e8e8",
  },
  {
    key: "editor.lineHighlightBackground",
    label: "Line Highlight",
    description: "Background highlight for the active cursor line",
    category: "editor",
    fallback: "#1a1a1a",
  },
  {
    key: "editor.selectionBackground",
    label: "Selection Background",
    description: "Background highlight for selected text range",
    category: "editor",
    fallback: "#264f78",
  },
  // Window Chrome group
  {
    key: "activityBar.background",
    label: "Activity Bar Background",
    description: "Background color of the side activity bar / header bar",
    category: "chrome",
    fallback: "#101010",
  },
  {
    key: "activityBar.foreground",
    label: "Activity Bar Foreground",
    description: "Icon and text color on the activity bar",
    category: "chrome",
    fallback: "#e8e8e8",
  },
  {
    key: "sideBar.background",
    label: "Sidebar Background",
    description: "Background color of the side panels (Explorer, Search, Git)",
    category: "chrome",
    fallback: "#141414",
  },
  {
    key: "sideBar.foreground",
    label: "Sidebar Foreground",
    description: "Foreground text and icons in the sidebar",
    category: "chrome",
    fallback: "#e8e8e8",
  },
  {
    key: "statusBar.background",
    label: "Status Bar Background",
    description: "Background color of the bottom status bar strip",
    category: "chrome",
    fallback: "#0e0e0e",
  },
  {
    key: "statusBar.foreground",
    label: "Status Bar Foreground",
    description: "Text and icon color inside the status bar",
    category: "chrome",
    fallback: "#e8e8e8",
  },
  {
    key: "accent",
    label: "Accent Color",
    description: "Highlight color for active indicators, focus borders, and badges",
    category: "chrome",
    fallback: "#3b82f6",
  },
  {
    key: "border",
    label: "Border Color",
    description: "Divider and container border outlines across islands",
    category: "chrome",
    fallback: "#2a2a2a",
  },
] as const;

export const THEME_PRESETS: Record<"dark" | "light" | "gruvbox" | "catppuccin", CustomThemeDefinition> = {
  dark: {
    id: "dark",
    label: "Dark",
    uiTheme: "vs-dark",
    colors: {
      "editor.background": "#141414",
      "editor.foreground": "#e8e8e8",
      "editor.lineHighlightBackground": "#1a1a1a",
      "editor.selectionBackground": "#264f78",
      "activityBar.background": "#101010",
      "activityBar.foreground": "#e8e8e8",
      "sideBar.background": "#141414",
      "sideBar.foreground": "#e8e8e8",
      "statusBar.background": "#0e0e0e",
      "statusBar.foreground": "#e8e8e8",
      accent: "#3b82f6",
      border: "#2a2a2a",
    },
  },
  light: {
    id: "light",
    label: "Light",
    uiTheme: "vs",
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1a1a1a",
      "editor.lineHighlightBackground": "#f5f5f5",
      "editor.selectionBackground": "#add6ff",
      "activityBar.background": "#f8f8f8",
      "activityBar.foreground": "#1a1a1a",
      "sideBar.background": "#ffffff",
      "sideBar.foreground": "#1a1a1a",
      "statusBar.background": "#f0f0f0",
      "statusBar.foreground": "#1a1a1a",
      accent: "#2563eb",
      border: "#d4d4d4",
    },
  },
  gruvbox: {
    id: "gruvbox",
    label: "Gruvbox",
    uiTheme: "vs-dark",
    colors: {
      "editor.background": "#282828",
      "editor.foreground": "#ebdbb2",
      "editor.lineHighlightBackground": "#3c3836",
      "editor.selectionBackground": "#504945",
      "activityBar.background": "#1d2021",
      "activityBar.foreground": "#ebdbb2",
      "sideBar.background": "#282828",
      "sideBar.foreground": "#ebdbb2",
      "statusBar.background": "#1d2021",
      "statusBar.foreground": "#ebdbb2",
      accent: "#fe8019",
      border: "#504945",
    },
  },
  catppuccin: {
    id: "catppuccin",
    label: "Catppuccin",
    uiTheme: "vs-dark",
    colors: {
      "editor.background": "#1e1e2e",
      "editor.foreground": "#cdd6f4",
      "editor.lineHighlightBackground": "#313244",
      "editor.selectionBackground": "#45475a",
      "activityBar.background": "#11111b",
      "activityBar.foreground": "#cdd6f4",
      "sideBar.background": "#1e1e2e",
      "sideBar.foreground": "#cdd6f4",
      "statusBar.background": "#11111b",
      "statusBar.foreground": "#cdd6f4",
      accent: "#cba6f7",
      border: "#45475a",
    },
  },
};

export const CUSTOM_THEMES_STORAGE_KEY = "t3d.customThemes";

/** Validate if a string is a standard 3, 6, or 8 character hex color */
export function isValidHexColor(color: string): boolean {
  if (typeof color !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
}

/** Normalize color to 6-digit hex format (#rrggbb) suitable for HTML5 color picker */
export function normalizeHex(color: string, fallback: string = "#000000"): string {
  if (!color || typeof color !== "string") return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{8}$/i.test(trimmed)) {
    return trimmed.slice(0, 7).toLowerCase();
  }
  return fallback;
}

/** Generate a URL-safe lowercase slug ID from a label */
export function slugifyThemeId(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "custom-theme";
}

/** Load all persisted custom themes from localStorage */
export function loadCustomThemes(): CustomThemeDefinition[] {
  const storage = typeof localStorage !== "undefined" ? localStorage : typeof window !== "undefined" ? window.localStorage : null;
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (t): t is CustomThemeDefinition =>
          Boolean(t && typeof t.id === "string" && typeof t.label === "string" && t.colors)
      );
    }
  } catch {
    /* ignore parse errors */
  }
  return [];
}

/** Save an array of custom themes to localStorage */
export function saveCustomThemes(themes: CustomThemeDefinition[]): void {
  const storage = typeof localStorage !== "undefined" ? localStorage : typeof window !== "undefined" ? window.localStorage : null;
  if (!storage) return;
  try {
    storage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
  } catch {
    /* ignore storage quota errors */
  }
}

/** Save or update a single custom theme */
export function saveCustomTheme(theme: CustomThemeDefinition): CustomThemeDefinition[] {
  const existing = loadCustomThemes();
  const idx = existing.findIndex((t) => t.id === theme.id);
  let updated: CustomThemeDefinition[];
  if (idx >= 0) {
    updated = [...existing];
    updated[idx] = theme;
  } else {
    updated = [...existing, theme];
  }
  saveCustomThemes(updated);
  return updated;
}

/** Delete a custom theme by ID */
export function deleteCustomTheme(id: string): CustomThemeDefinition[] {
  const existing = loadCustomThemes();
  const updated = existing.filter((t) => t.id !== id);
  saveCustomThemes(updated);
  return updated;
}

/** Retrieve a single custom theme by ID */
export function getCustomTheme(id: string): CustomThemeDefinition | undefined {
  const cleanId = id.startsWith("custom:") ? id.slice(7) : id;
  return loadCustomThemes().find((t) => t.id === cleanId || t.id === id);
}

/**
 * Strip single-line and multi-line comments and trailing commas from JSON strings (JSONC).
 */
export function stripJsonComments(input: string): string {
  let insideString = false;
  let stringChar = "";
  let isEscaped = false;
  let result = "";
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const ch = input[i];
    const next = i + 1 < len ? input[i + 1] : "";

    if (insideString) {
      result += ch;
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === stringChar) {
        insideString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      insideString = true;
      stringChar = ch;
      result += ch;
      continue;
    }

    // Single-line comment
    if (ch === "/" && next === "/") {
      while (i < len && input[i] !== "\n" && input[i] !== "\r") {
        i++;
      }
      result += "\n";
      continue;
    }

    // Multi-line comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < len && !(input[i] === "*" && input[i + 1] === "/")) {
        i++;
      }
      i++;
      continue;
    }

    result += ch;
  }

  // Remove trailing commas before } or ]
  return result.replace(/,\s*([\]}])/g, "$1");
}

/**
 * Format custom theme definition into extension theme contribution format (contributes.themes schema).
 */
export function exportCustomThemeJson(theme: CustomThemeDefinition): string {
  const isLight = theme.uiTheme === "vs";
  const payload = {
    id: theme.id,
    label: theme.label,
    uiTheme: theme.uiTheme,
    mode: isLight ? "light" : "dark",
    colors: {
      "editor.background": theme.colors["editor.background"],
      "editor.foreground": theme.colors["editor.foreground"],
      "editor.lineHighlightBackground": theme.colors["editor.lineHighlightBackground"],
      "editor.selectionBackground": theme.colors["editor.selectionBackground"],
      "activityBar.background": theme.colors["activityBar.background"],
      "activityBar.foreground": theme.colors["activityBar.foreground"],
      "sideBar.background": theme.colors["sideBar.background"],
      "sideBar.foreground": theme.colors["sideBar.foreground"],
      "statusBar.background": theme.colors["statusBar.background"],
      "statusBar.foreground": theme.colors["statusBar.foreground"],
      accent: theme.colors.accent,
      border: theme.colors.border,
      // Extension shorthand compatibility
      bg: theme.colors["editor.background"],
      fg: theme.colors["editor.foreground"],
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse and validate theme JSON from extension contributes.themes schema or raw theme object.
 */
export function importCustomThemeFromJson(rawJson: string): CustomThemeDefinition {
  if (!rawJson || typeof rawJson !== "string") {
    throw new Error("Theme JSON input must be a non-empty string");
  }

  let parsed: any;
  const cleaned = stripJsonComments(rawJson.trim());
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Failed to parse theme JSON: ${err?.message || "Invalid JSON syntax"}`);
  }

  // Handle extension manifest wrapper: contributes.themes
  if (parsed?.contributes?.themes && Array.isArray(parsed.contributes.themes) && parsed.contributes.themes[0]) {
    parsed = parsed.contributes.themes[0];
  } else if (Array.isArray(parsed) && parsed[0]) {
    parsed = parsed[0];
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Theme payload must be a JSON object");
  }

  const label =
    (typeof parsed.label === "string" && parsed.label.trim()) ||
    (typeof parsed.name === "string" && parsed.name.trim()) ||
    "Custom Imported Theme";
  const id =
    (typeof parsed.id === "string" && parsed.id.trim() && slugifyThemeId(parsed.id)) ||
    slugifyThemeId(label);

  const rawUiTheme = String(parsed.uiTheme || parsed.type || parsed.mode || "").toLowerCase();
  const uiTheme: UiTheme = rawUiTheme === "vs" || rawUiTheme === "light" ? "vs" : "vs-dark";

  const rawColors = parsed.colors || parsed.theme?.colors;
  if (!rawColors || typeof rawColors !== "object") {
    throw new Error("Theme JSON is missing a valid 'colors' object");
  }

  const baseDefault = uiTheme === "vs" ? THEME_PRESETS.light : THEME_PRESETS.dark;

  const resolve = (keys: string[], fallback: string): string => {
    for (const k of keys) {
      const val = rawColors[k];
      if (typeof val === "string" && val.trim()) {
        const trimmed = val.trim();
        if (isValidHexColor(trimmed)) {
          return trimmed.toLowerCase();
        }
        return normalizeHex(trimmed, fallback);
      }
    }
    return fallback;
  };

  const colors = {
    "editor.background": resolve(
      ["editor.background", "editorBackground", "bg", "background"],
      baseDefault.colors["editor.background"]
    ),
    "editor.foreground": resolve(
      ["editor.foreground", "editorForeground", "fg", "foreground"],
      baseDefault.colors["editor.foreground"]
    ),
    "editor.lineHighlightBackground": resolve(
      ["editor.lineHighlightBackground", "lineHighlight", "lineHighlightBackground", "editor.lineHighlightBorder"],
      baseDefault.colors["editor.lineHighlightBackground"]
    ),
    "editor.selectionBackground": resolve(
      ["editor.selectionBackground", "selectionBackground", "selection", "editor.selectionHighlightBackground"],
      baseDefault.colors["editor.selectionBackground"]
    ),
    "activityBar.background": resolve(
      ["activityBar.background", "activityBarBackground", "titleBar.activeBackground"],
      baseDefault.colors["activityBar.background"]
    ),
    "activityBar.foreground": resolve(
      ["activityBar.foreground", "activityBarForeground", "titleBar.activeForeground"],
      baseDefault.colors["activityBar.foreground"]
    ),
    "sideBar.background": resolve(
      ["sideBar.background", "sideBarBackground", "sidebarBackground"],
      baseDefault.colors["sideBar.background"]
    ),
    "sideBar.foreground": resolve(
      ["sideBar.foreground", "sideBarForeground", "sidebarForeground"],
      baseDefault.colors["sideBar.foreground"]
    ),
    "statusBar.background": resolve(
      ["statusBar.background", "statusBarBackground", "statusBar.debuggingBackground"],
      baseDefault.colors["statusBar.background"]
    ),
    "statusBar.foreground": resolve(
      ["statusBar.foreground", "statusBarForeground"],
      baseDefault.colors["statusBar.foreground"]
    ),
    accent: resolve(
      ["accent", "activityBarBadge.background", "focusBorder", "button.background", "badge.background"],
      baseDefault.colors.accent
    ),
    border: resolve(
      ["border", "sideBar.border", "panel.border", "editorGroup.border", "contrastBorder", "window.activeBorder"],
      baseDefault.colors.border
    ),
  };

  return {
    id,
    label,
    uiTheme,
    colors,
  };
}

const CUSTOM_STYLE_TAG_ID = "t3d-custom-theme-vars";

/** Apply or clear dynamic CSS custom properties for custom themes */
export function applyCustomThemeCss(theme: CustomThemeDefinition | null): void {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;

  let styleEl = document.getElementById(CUSTOM_STYLE_TAG_ID) as HTMLStyleElement | null;

  if (!theme) {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  const { uiTheme } = theme;
  const baseDefault = uiTheme === "vs" ? THEME_PRESETS.light.colors : THEME_PRESETS.dark.colors;
  const colors = theme.colors || {};

  // Safe fallback resolution for all slots to prevent undefined or empty CSS values
  const editorBg = colors["editor.background"] || baseDefault["editor.background"];
  const editorFg = colors["editor.foreground"] || baseDefault["editor.foreground"];
  const sideBarBg = colors["sideBar.background"] || baseDefault["sideBar.background"];
  const sideBarFg = colors["sideBar.foreground"] || baseDefault["sideBar.foreground"];
  const activityBarBg = colors["activityBar.background"] || baseDefault["activityBar.background"];
  const activityBarFg = colors["activityBar.foreground"] || baseDefault["activityBar.foreground"];
  const statusBarBg = colors["statusBar.background"] || baseDefault["statusBar.background"];
  const statusBarFg = colors["statusBar.foreground"] || baseDefault["statusBar.foreground"];
  const accent = colors.accent || baseDefault.accent;
  const border = colors.border || baseDefault.border;

  const css = `
:root, :root[data-theme], [data-theme] {
  color-scheme: ${uiTheme === "vs" ? "light" : "dark"};
  --bg-island: ${editorBg};
  --bg-island-elevated: ${sideBarBg};
  --bg-root: ${activityBarBg};
  --bg-hover: color-mix(in srgb, ${editorBg} 88%, ${editorFg});
  --bg-active: color-mix(in srgb, ${editorBg} 80%, ${editorFg});
  --bg-input: ${sideBarBg};
  --bg-tab: ${sideBarBg};
  --bg-tab-active: ${editorBg};
  --border: ${border};
  --border-subtle: color-mix(in srgb, ${border} 70%, transparent);
  --fg: ${editorFg};
  --fg-muted: color-mix(in srgb, ${editorFg} 65%, transparent);
  --fg-dim: color-mix(in srgb, ${editorFg} 45%, transparent);
  --fg-inverse: ${uiTheme === "vs" ? "#000000" : "#ffffff"};
  --accent: ${accent};
  --accent-soft: color-mix(in srgb, ${accent} 18%, transparent);
  --activity-bar-bg: ${activityBarBg};
  --activity-bar-fg: ${activityBarFg};
  --sidebar-bg: ${sideBarBg};
  --sidebar-fg: ${sideBarFg};
  --statusbar-bg: ${statusBarBg};
  --statusbar-fg: ${statusBarFg};
  --scrollbar-thumb: color-mix(in srgb, ${editorFg} 18%, transparent);
  --scrollbar-thumb-hover: color-mix(in srgb, ${editorFg} 32%, transparent);
  --scrollbar-thumb-active: color-mix(in srgb, ${editorFg} 48%, transparent);
}
`;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = CUSTOM_STYLE_TAG_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
