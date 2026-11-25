import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import { useEditorActions } from "./EditorActions";
import { defineT3dThemes, monacoThemeId } from "./theme";
import "./MonacoEditor.css";

export function MonacoEditor() {
  const {
    document,
    setValue,
    setCursor,
    revealTarget,
    clearRevealTarget,
  } = useWorkspace();
  const { theme } = useTheme();
  const { registerFindHandler } = useEditorActions();
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoThemeId(theme));
    }
  }, [theme]);

  useEffect(() => {
    registerFindHandler(() => {
      const ed = editorRef.current;
      if (!ed) return;
      void ed.getAction("actions.find")?.run();
    });
    return () => registerFindHandler(null);
  }, [registerFindHandler]);

  useEffect(() => {
    if (!revealTarget || !document || revealTarget.path !== document.path) {
      return;
    }
    const ed = editorRef.current;
    if (!ed) return;
    ed.revealPositionInCenter({
      lineNumber: revealTarget.line,
      column: revealTarget.column,
    });
    ed.setPosition({
      lineNumber: revealTarget.line,
      column: revealTarget.column,
    });
    ed.focus();
    clearRevealTarget();
  }, [revealTarget, document, clearRevealTarget]);

  if (!document) return null;

  const handleBeforeMount = (monaco: Monaco) => {
    defineT3dThemes(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    monaco.editor.setTheme(monacoThemeId(theme));
    ed.focus();

    const syncCursor = () => {
      const position = ed.getPosition();
      if (position) {
        setCursor(position.lineNumber, position.column);
      }
    };

    syncCursor();
    ed.onDidChangeCursorPosition(syncCursor);

    if (revealTarget && revealTarget.path === document.path) {
      ed.revealPositionInCenter({
        lineNumber: revealTarget.line,
        column: revealTarget.column,
      });
      ed.setPosition({
        lineNumber: revealTarget.line,
        column: revealTarget.column,
      });
      clearRevealTarget();
    }
  };

  return (
    <div className="monaco-editor-host">
      <Editor
        path={document.path ?? undefined}
        theme={monacoThemeId(theme)}
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
