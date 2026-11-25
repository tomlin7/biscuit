import type { Monaco } from "@monaco-editor/react";
import type { ExtraTheme } from "../extensions/contributions";

export const T3D_THEME_DARK = "t3d-dark";
export const T3D_THEME_LIGHT = "t3d-light";

export function monacoThemeId(theme: string, extras: ExtraTheme[] = []): string {
  if (theme === "light") return T3D_THEME_LIGHT;
  if (theme.startsWith("ext:")) {
    const id = theme.slice(4);
    if (extras.some((item) => item.id === id)) return `t3d-ext-${id}`;
  }
  return T3D_THEME_DARK;
}

export function defineExtraThemes(monaco: Monaco, extras: ExtraTheme[]) {
  for (const extra of extras) {
    const light = extra.mode === "light";
    monaco.editor.defineTheme(`t3d-ext-${extra.id}`, {
      base: light ? "vs" : "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": extra.colors.bg || (light ? "#ffffff" : "#141414"),
        "editor.foreground": extra.colors.fg || (light ? "#1a1a1a" : "#e8e8e8"),
        "editor.selectionBackground": extra.colors.accent || (light ? "#add6ff" : "#264f78"),
      },
    });
  }
}

export function defineT3dThemes(monaco: Monaco) {
  monaco.editor.defineTheme(T3D_THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#141414",
      "editor.foreground": "#e8e8e8",
      "editorLineNumber.foreground": "#5c5c5c",
      "editorLineNumber.activeForeground": "#8a8a8a",
      "editorCursor.foreground": "#e8e8e8",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#3a3d41",
      "editor.lineHighlightBackground": "#1a1a1a",
      "editorIndentGuide.background1": "#2a2a2a",
      "editorIndentGuide.activeBackground1": "#3a3a3a",
      "editorWidget.background": "#1a1a1a",
      "editorWidget.border": "#2a2a2a",
      "editorSuggestWidget.background": "#1a1a1a",
      "editorSuggestWidget.border": "#2a2a2a",
      "editorGutter.background": "#141414",
      "scrollbarSlider.background": "#ffffff22",
      "scrollbarSlider.hoverBackground": "#ffffff33",
    },
  });

  monaco.editor.defineTheme(T3D_THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1a1a1a",
      "editorLineNumber.foreground": "#9a9a9a",
      "editorLineNumber.activeForeground": "#6b6b6b",
      "editorCursor.foreground": "#1a1a1a",
      "editor.selectionBackground": "#add6ff",
      "editor.inactiveSelectionBackground": "#e5ebf1",
      "editor.lineHighlightBackground": "#f5f5f5",
      "editorIndentGuide.background1": "#e4e4e4",
      "editorIndentGuide.activeBackground1": "#d4d4d4",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#d4d4d4",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#d4d4d4",
      "editorGutter.background": "#ffffff",
      "scrollbarSlider.background": "#00000022",
      "scrollbarSlider.hoverBackground": "#00000033",
    },
  });
}
