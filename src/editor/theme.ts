import type { Monaco } from "@monaco-editor/react";

export const T3D_THEME = "t3d-dark";

export function defineT3dTheme(monaco: Monaco) {
  monaco.editor.defineTheme(T3D_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editor.foreground": "#cccccc",
      "editorLineNumber.foreground": "#6e6e6e",
      "editorLineNumber.activeForeground": "#cccccc",
      "editorCursor.foreground": "#aeafad",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#3a3d41",
      "editorIndentGuide.background1": "#404040",
      "editorIndentGuide.activeBackground1": "#707070",
      "editorWidget.background": "#252526",
      "editorWidget.border": "#3c3c3c",
      "editorSuggestWidget.background": "#252526",
      "editorSuggestWidget.border": "#3c3c3c",
      "editorGutter.background": "#1e1e1e",
    },
  });
}
