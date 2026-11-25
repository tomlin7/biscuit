import type { Monaco } from "@monaco-editor/react";

export const T3D_THEME = "t3d-dark";

export function defineT3dTheme(monaco: Monaco) {
  monaco.editor.defineTheme(T3D_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#121212",
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
      "editorGutter.background": "#121212",
      "scrollbarSlider.background": "#ffffff22",
      "scrollbarSlider.hoverBackground": "#ffffff33",
    },
  });
}
