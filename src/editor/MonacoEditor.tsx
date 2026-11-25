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
import { editorConfigFor } from "./editorconfig";
import { detectIndentFromText } from "./detectIndent";
import { parseRulers } from "./rulers";
import { defineExtraThemes, defineT3dThemes, monacoThemeId } from "./theme";
import { registerTsHoverProviders } from "../lsp/tsHover";
import "./MonacoEditor.css";

type Props = {
  /** Bind to a specific tab path. Defaults to the active document. */
  path?: string;
  /** Only the primary pane owns find-in-file. */
  primary?: boolean;
  onScrollRatio?: (ratio: number) => void;
};

export function MonacoEditor({ path, primary = true, onScrollRatio }: Props) {
  const {
    document: activeDoc,
    tabs,
    setValue,
    setValueAt,
    setCursor,
    setSelection,
    revealTarget,
    clearRevealTarget,
    activateTab,
    openFileAt,
    rootPath,
  } = useWorkspace();
  const doc = path
    ? (tabs.find((t) => t.path === path) ?? null)
    : activeDoc;
  const { theme, extras } = useTheme();
  const { registerFindHandler, registerFindInSelectionHandler, registerEditor, showPeek, showReferences, setFindMatchLabel } =
    useEditorActions();
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
    const ed = editorRef.current;
    if (!ed || !doc) return;
    let cancelled = false;
    void editorConfigFor(doc.path, rootPath).then((config) => {
      if (cancelled) return;
      if (config.indentSize || config.indentStyle) {
        ed.updateOptions({
          detectIndentation: false,
          ...(config.indentSize ? { tabSize: config.indentSize } : {}),
          ...(config.indentStyle ? { insertSpaces: config.indentStyle === "space" } : {}),
        });
        return;
      }
      const sniffed = detectIndentFromText(doc.value);
      if (!sniffed) return;
      ed.updateOptions({
        detectIndentation: false,
        tabSize: sniffed.tabSize,
        insertSpaces: sniffed.insertSpaces,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [doc?.path, rootPath]);

  const applyReveal = () => {
    if (!primary || !revealTarget || !doc || revealTarget.path !== doc.path) return false;
    const ed = editorRef.current;
    if (!ed) return false;
    const line = Math.max(1, revealTarget.line);
    const column = Math.max(1, revealTarget.column);
    ed.revealPositionInCenter({ lineNumber: line, column });
    ed.setPosition({ lineNumber: line, column });
    ed.focus();
    clearRevealTarget();
    return true;
  };

  useEffect(() => {
    if (!primary || !revealTarget || !doc || revealTarget.path !== doc.path) return;
    if (applyReveal()) return;
    const timer = window.setTimeout(() => {
      applyReveal();
    }, 40);
    return () => window.clearTimeout(timer);
    // applyReveal reads latest refs; deps cover the reveal trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealTarget, doc?.path, clearRevealTarget, primary]);

  useEffect(() => {
    if (monacoRef.current) {
      defineExtraThemes(monacoRef.current, extras);
      monacoRef.current.editor.setTheme(monacoThemeId(theme, extras));
    }
  }, [theme, extras]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      minimap: { enabled: settings.editor.minimap, scale: 1 },
      stickyScroll: { enabled: settings.editor.stickyScroll },
      tabSize: settings.editor.tabSize,
      wordWrap: settings.editor.wordWrap ? "bounded" : "off",
      wordWrapColumn: settings.editor.wordWrapColumn,
      wrappingStrategy: "advanced",
      renderWhitespace: settings.editor.renderWhitespace ? "all" : "none",
      cursorStyle: settings.editor.cursorStyle,
      rulers: parseRulers(settings.editor.rulers),
    });
  }, [
    settings.editor.minimap,
    settings.editor.stickyScroll,
    settings.editor.tabSize,
    settings.editor.wordWrap,
    settings.editor.wordWrapColumn,
    settings.editor.renderWhitespace,
    settings.editor.cursorStyle,
    settings.editor.rulers,
  ]);

  useEffect(() => {
    if (!primary) return;
    registerFindHandler(() => {
      const ed = editorRef.current;
      if (!ed) return;
      void ed.getAction("actions.find")?.run();
    });
    registerFindInSelectionHandler(() => {
      const ed = editorRef.current;
      if (!ed) return;
      const withSelection = ed.getAction("actions.findWithSelection");
      if (withSelection) {
        void withSelection.run();
        return;
      }
      void ed.getAction("actions.find")?.run();
      try {
        const controller = (
          ed as unknown as {
            getContribution: (id: string) => {
              toggleSearchScope?: () => void;
            } | null;
          }
        ).getContribution("editor.contrib.findController");
        controller?.toggleSearchScope?.();
      } catch {
        /* ignore */
      }
    });
    const updateFindLabel = () => {
      const ed = editorRef.current;
      if (!ed) {
        setFindMatchLabel(null);
        return;
      }
      try {
        const controller = (
          ed as unknown as {
            getContribution: (id: string) => {
              getState?: () => {
                matchesCount?: number;
                currentMatch?: number;
                isRevealed?: boolean;
                isReplaceRevealed?: boolean;
                searchString?: string;
              };
            } | null;
          }
        ).getContribution("editor.contrib.findController");
        const state = controller?.getState?.();
        if (!state?.searchString) {
          setFindMatchLabel(null);
          return;
        }
        const open = state.isRevealed === true || state.isReplaceRevealed === true;
        if (!open) {
          setFindMatchLabel(null);
          return;
        }
        const total = state.matchesCount ?? 0;
        const current = state.currentMatch ?? 0;
        setFindMatchLabel(total > 0 ? `${current || 1} of ${total}` : "No results");
      } catch {
        setFindMatchLabel(null);
      }
    };
    const findDisposable = editorRef.current?.onDidChangeCursorSelection(() => {
      window.setTimeout(updateFindLabel, 0);
    });
    const findTimer = window.setInterval(updateFindLabel, 400);
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
      registerFindInSelectionHandler(null);
      registerEditor(null);
      findDisposable?.dispose();
      window.clearInterval(findTimer);
      setFindMatchLabel(null);
    };
  }, [
    registerFindHandler,
    registerFindInSelectionHandler,
    registerEditor,
    primary,
    setFindMatchLabel,
  ]);

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
    registerTsHoverProviders(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    defineExtraThemes(monaco, extras);
    monaco.editor.setTheme(monacoThemeId(theme, extras));
    const model = ed.getModel();
    const language = model?.getLanguageId();
    if (model && language && language !== "typescript" && language !== "javascript") {
      monaco.editor.setModelMarkers(model, "typescript", []);
      monaco.editor.setModelMarkers(model, "javascript", []);
    }
    const relayout = () => ed.layout();
    requestAnimationFrame(relayout);
    window.setTimeout(relayout, 50);
    if (primary) ed.focus();
    window.setTimeout(() => {
      applyReveal();
    }, 0);

    ed.onDidFocusEditorText(() => {
      if (pathRef.current) activateTab(pathRef.current);
    });

    const syncCursor = () => {
      if (!primary) return;
      const position = ed.getPosition();
      if (position) {
        setCursor(position.lineNumber, position.column);
      }
      const selection = ed.getSelection();
      if (!selection || selection.isEmpty()) {
        setSelection(0, 0, "");
        return;
      }
      const model = ed.getModel();
      const text = model?.getValueInRange(selection) ?? "";
      const lines = selection.endLineNumber - selection.startLineNumber + 1;
      setSelection(text.length, lines, text);
    };

    syncCursor();
    ed.onDidChangeCursorPosition(syncCursor);
    ed.onDidChangeCursorSelection(syncCursor);

    if (primary && onScrollRatio) {
      ed.onDidScrollChange(() => {
        const top = ed.getScrollTop();
        const height = ed.getScrollHeight() - ed.getLayoutInfo().height;
        onScrollRatio(height > 0 ? Math.min(1, Math.max(0, top / height)) : 0);
      });
    }

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
        theme={monacoThemeId(theme, extras)}
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
          stickyScroll: { enabled: settings.editor.stickyScroll },
          wordWrap: settings.editor.wordWrap ? "bounded" : "off",
          wordWrapColumn: settings.editor.wordWrapColumn,
          wrappingStrategy: "advanced",
          renderWhitespace: settings.editor.renderWhitespace ? "all" : "none",
          cursorStyle: settings.editor.cursorStyle,
          rulers: parseRulers(settings.editor.rulers),
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
