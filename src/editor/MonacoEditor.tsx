import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import * as monacoApi from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import { useEditorActions } from "./EditorActions";
import { useDebug } from "../debug/DebugContext";
import { useSettings } from "../settings/SettingsContext";
import { defineT3dThemes, monacoThemeId } from "./theme";
import "./MonacoEditor.css";

type Props = {
  /** Bind to a specific tab path. Defaults to the active document. */
  path?: string;
  /** Only the primary pane owns find-in-file. */
  primary?: boolean;
};

export function MonacoEditor({ path, primary = true }: Props) {
  const {
    document: activeDoc,
    tabs,
    setValue,
    setValueAt,
    setCursor,
    revealTarget,
    clearRevealTarget,
    activateTab,
  } = useWorkspace();
  const doc = path
    ? (tabs.find((t) => t.path === path) ?? null)
    : activeDoc;
  const { theme } = useTheme();
  const { registerFindHandler } = useEditorActions();
  const { breakpoints, addBreakpoint, removeBreakpoint } = useDebug();
  const { settings } = useSettings();
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const breakpointsRef = useRef(breakpoints);
  breakpointsRef.current = breakpoints;
  const pathRef = useRef(doc?.path ?? null);
  pathRef.current = doc?.path ?? null;

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoThemeId(theme));
    }
  }, [theme]);

  useEffect(() => {
    if (!primary) return;
    registerFindHandler(() => {
      const ed = editorRef.current;
      if (!ed) return;
      void ed.getAction("actions.find")?.run();
    });
    return () => registerFindHandler(null);
  }, [registerFindHandler, primary]);

  useEffect(() => {
    if (!primary || !revealTarget || !doc || revealTarget.path !== doc.path) {
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
  }, [revealTarget, doc, clearRevealTarget, primary]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !doc) return;
    const forFile = breakpoints.filter(
      (bp) => bp.path === doc.path && bp.enabled,
    );
    decorationsRef.current = ed.deltaDecorations(
      decorationsRef.current,
      forFile.map((bp) => ({
        range: new monacoApi.Range(bp.line, 1, bp.line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: "monaco-breakpoint-glyph",
          className: "monaco-breakpoint-line",
        },
      })),
    );
  }, [breakpoints, doc]);

  if (!doc) return null;

  const handleBeforeMount = (monaco: Monaco) => {
    defineT3dThemes(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    monaco.editor.setTheme(monacoThemeId(theme));
    const relayout = () => ed.layout();
    requestAnimationFrame(relayout);
    window.setTimeout(relayout, 50);
    if (primary) ed.focus();

    ed.onDidFocusEditorText(() => {
      if (pathRef.current) activateTab(pathRef.current);
    });

    const syncCursor = () => {
      if (!primary) return;
      const position = ed.getPosition();
      if (position) {
        setCursor(position.lineNumber, position.column);
      }
    };

    syncCursor();
    ed.onDidChangeCursorPosition(syncCursor);

    ed.onMouseDown((e) => {
      if (
        e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        return;
      }
      const line = e.target.position?.lineNumber;
      const filePath = pathRef.current;
      if (!line || !filePath) return;
      const existing = breakpointsRef.current.find(
        (bp) => bp.path === filePath && bp.line === line,
      );
      if (existing) {
        removeBreakpoint(existing.id);
      } else {
        addBreakpoint(filePath, line);
      }
    });
  };

  return (
    <div className="monaco-editor-host">
      <Editor
        path={doc.path}
        theme={monacoThemeId(theme)}
        language={doc.language}
        value={doc.value}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(next) => {
          if (path) setValueAt(path, next ?? "");
          else setValue(next ?? "");
        }}
        loading={<div className="monaco-editor-host__loading">Loading editor…</div>}
        options={{
          fontFamily: "Cascadia Code, Consolas, Courier New, monospace",
          fontSize: settings.editor.fontSize,
          lineHeight: Math.round(settings.editor.fontSize * 1.55),
          minimap: { enabled: settings.editor.minimap, scale: 1 },
          wordWrap: settings.editor.wordWrap ? "on" : "off",
          lineNumbers: settings.editor.lineNumbers ? "on" : "off",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: settings.editor.tabSize,
          renderLineHighlight: "line",
          glyphMargin: true,
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
