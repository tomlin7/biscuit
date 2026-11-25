import { useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { defineT3dTheme, T3D_THEME } from "./theme";
import "./MonacoEditor.css";

export function MonacoEditor() {
  const { document, setValue, setCursor } = useWorkspace();
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);

  if (!document) return null;

  const handleBeforeMount = (monaco: Monaco) => {
    defineT3dTheme(monaco);
  };

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;
    ed.focus();

    const syncCursor = () => {
      const position = ed.getPosition();
      if (position) {
        setCursor(position.lineNumber, position.column);
      }
    };

    syncCursor();
    ed.onDidChangeCursorPosition(syncCursor);
  };

  return (
    <div className="monaco-editor-host">
      <Editor
        path={document.path ?? undefined}
        theme={T3D_THEME}
        language={document.language}
        value={document.value}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(next) => {
          setValue(next ?? "");
        }}
        loading={<div className="monaco-editor-host__loading">Loading editor…</div>}
        options={{
          fontFamily: "Cascadia Code, Consolas, Courier New, monospace",
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: "line",
          padding: { top: 8 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
}
