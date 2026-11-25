import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import * as monacoApi from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import { useEditorActions } from "./EditorActions";
import { typescript } from "monaco-editor";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { referencesAt, renamePlan } from "../lsp/tsLocations";
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
    openFileAt,
  } = useWorkspace();
  const doc = path
    ? (tabs.find((t) => t.path === path) ?? null)
    : activeDoc;
  const { theme } = useTheme();
  const { registerFindHandler, registerEditor, showPeek, showReferences } = useEditorActions();
  const showPeekRef = useRef(showPeek);
  showPeekRef.current = showPeek;
  const showReferencesRef = useRef(showReferences);
  showReferencesRef.current = showReferences;
  const openFileAtRef = useRef(openFileAt);
  openFileAtRef.current = openFileAt;
  const { breakpoints, addBreakpoint, removeBreakpoint } = useDebug();
  const { settings } = useSettings();
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const breakpointsRef = useRef(breakpoints);
  breakpointsRef.current = breakpoints;
  const pathRef = useRef(doc?.path ?? null);
  pathRef.current = doc?.path ?? null;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const setValueAtRef = useRef(setValueAt);
  setValueAtRef.current = setValueAt;

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
    registerEditor({
      trigger: (action) => {
        void editorRef.current?.getAction(action)?.run();
      },
      updateOptions: (options) => {
        editorRef.current?.updateOptions(options);
      },
      lookupDefinition: (jump) => {
        void (async () => {
          const ed = editorRef.current;
          const model = ed?.getModel();
          const position = ed?.getPosition();
          if (!model || !position) return;
          const language = model.getLanguageId();
          if (language !== "typescript" && language !== "javascript") {
            showPeekRef.current({
              title: "No language service",
              preview: "Peek definition is available for JavaScript and TypeScript.",
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          const worker = await typescript.getTypeScriptWorker();
          const client = await worker(model.uri);
          const defs = (await client.getDefinitionAtPosition(
            model.uri.toString(),
            model.getOffsetAt(position),
          )) as Array<{ fileName?: string; textSpan?: { start?: number } }> | undefined;
          const def = defs?.[0];
          const start = def?.textSpan?.start;
          if (!def?.fileName || start == null) {
            showPeekRef.current({
              title: "No definition",
              preview: "The language service did not find a definition here.",
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          const targetPath = def.fileName.startsWith("file:")
            ? monacoApi.Uri.parse(def.fileName).fsPath
            : def.fileName;
          const text = await readTextFile(targetPath);
          const before = text.slice(0, start);
          const line = before.split(/\n/).length;
          const lastBreak = before.lastIndexOf("\n");
          const column = start - (lastBreak < 0 ? 0 : lastBreak);
          const preview = text
            .split(/\n/)
            .slice(Math.max(0, line - 3), line + 6)
            .join("\n");
          const title = targetPath.split(/[/\\]/).pop() ?? targetPath;
          showPeekRef.current({ title, preview, path: targetPath, line, column });
          if (jump) await openFileAtRef.current(targetPath, line, column);
        })().catch((err) => {
          showPeekRef.current({
            title: "Definition failed",
            preview: err instanceof Error ? err.message : String(err),
            path: "",
            line: 1,
            column: 1,
          });
        });
      },
      findReferences: () => {
        void (async () => {
          const ed = editorRef.current;
          const model = ed?.getModel();
          const position = ed?.getPosition();
          if (!model || !position) return;
          const language = model.getLanguageId();
          if (language !== "typescript" && language !== "javascript") {
            showPeekRef.current({
              title: "No language service",
              preview: "Find references is available for JavaScript and TypeScript.",
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          const hits = await referencesAt(model, model.getOffsetAt(position));
          if (hits.length === 0) {
            showPeekRef.current({
              title: "No references",
              preview: "The language service did not find references here.",
              path: "",
              line: 1,
              column: 1,
            });
            showReferencesRef.current(null);
            return;
          }
          showPeekRef.current(null);
          showReferencesRef.current(
            hits.map((hit) => ({
              path: hit.path,
              line: hit.line,
              column: hit.column,
              preview: hit.preview,
            })),
          );
        })().catch((err) => {
          showPeekRef.current({
            title: "References failed",
            preview: err instanceof Error ? err.message : String(err),
            path: "",
            line: 1,
            column: 1,
          });
        });
      },
      renameSymbol: () => {
        void (async () => {
          const model = editorRef.current?.getModel();
          const position = editorRef.current?.getPosition();
          if (!model || !position) return;
          const offset = model.getOffsetAt(position);
          const probe = await renamePlan(model, offset, "");
          if (!probe.ok && probe.message) {
            showPeekRef.current({
              title: "Cannot rename",
              preview: probe.message,
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          const current = probe.ok ? "" : (probe.current ?? "");
          const next = window.prompt("Rename symbol", current);
          if (next == null) return;
          const name = next.trim();
          if (!name || name === current) return;
          if (!/^[$A-Za-z_][\w$]*$/.test(name)) {
            showPeekRef.current({
              title: "Cannot rename",
              preview: "Use a single identifier with no spaces.",
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          const plan = await renamePlan(model, offset, name);
          if (!plan.ok) {
            showPeekRef.current({
              title: "Cannot rename",
              preview: plan.message,
              path: "",
              line: 1,
              column: 1,
            });
            return;
          }
          for (const file of plan.files) {
            const key = file.path.replace(/\\/g, "/").toLowerCase();
            const open = tabsRef.current.find(
              (tab) => tab.path.replace(/\\/g, "/").toLowerCase() === key,
            );
            if (open) setValueAtRef.current(open.path, file.text);
            else await writeTextFile(file.path, file.text);
          }
          showPeekRef.current({
            title: "Renamed",
            preview: `Updated ${plan.files.length} file${plan.files.length === 1 ? "" : "s"}. Open files are unsaved until you save them.`,
            path: "",
            line: 1,
            column: 1,
          });
        })().catch((err) => {
          showPeekRef.current({
            title: "Rename failed",
            preview: err instanceof Error ? err.message : String(err),
            path: "",
            line: 1,
            column: 1,
          });
        });
      },
    });
    return () => {
      registerFindHandler(null);
      registerEditor(null);
    };
  }, [registerFindHandler, registerEditor, primary]);

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
