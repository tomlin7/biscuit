import { useEffect, useMemo, useRef, useState } from "react";
import {
  Columns2,
  ExternalLink,
  Eye,
  FileCode2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { HtmlPreview } from "../editor/HtmlPreview";
import { MarkdownPreview } from "../editor/MarkdownPreview";
import { ImageView } from "../editor/ImageView";
import { PdfView } from "../editor/PdfView";
import { MonacoEditor } from "../editor/MonacoEditor";
import { DiffView, useDiffTab } from "../scm/DiffView";
import { CompareView } from "../scm/CompareView";
import { closeCompareTab, subscribeCompare, type CompareState } from "../scm/compareBus";
import { EditorTabs } from "../workspace/EditorTabs";
import { Welcome } from "../workspace/Welcome";
import { useWorkspace } from "../workspace/WorkspaceContext";
import {
  isWebviewPath,
  isVirtualPath,
  relativeToRoot,
  workspaceCrumbs,
  parentPath,
} from "../workspace/path";
import { ExtensionWebviewView } from "../extensions/ExtensionWebviewView";
import { rootForPath } from "../ai/roots";
import { listDirectory } from "../workspace/fsTree";
import { patchSession, readSession } from "../workspace/session";
import { useEditorActions } from "../editor/EditorActions";
import { useLayout } from "./LayoutContext";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import { ResizeHandle } from "./ResizeHandle";
import { setSplitEditorListener } from "./splitBus";
import { symbolsForFile, kindShort } from "../lsp/OutlinePanel";
import { getActiveSymbolPath, getSiblingSymbols } from "../lsp/symbolBreadcrumb";
import type { OutlineSymbol } from "../lsp/outlineScan";

type CrumbMenuState = {
  x: number;
  y: number;
  kind: "file" | "directory" | "symbol";
  path: string;
  siblings?: { name: string; path: string; kind: "file" | "directory" }[];
  symbol?: OutlineSymbol;
  symbolSiblings?: OutlineSymbol[];
};

export function EditorArea() {
  const {
    document,
    rootPath,
    roots,
    tabs,
    activePath,
    openFile,
    openFileAt,
    openUntitled,
    revealInExplorer,
  } = useWorkspace();
  const { findInFile, peek, clearPeek, references, clearReferences, findMatchLabel } =
    useEditorActions();
  const { toggleAi, aiOpen } = useLayout();
  const diffTab = useDiffTab();
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  useEffect(() => subscribeCompare(setCompareState), []);
  const [split, setSplit] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<"right" | "down">("right");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [secondaryPath, setSecondaryPath] = useState<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [crumbMenu, setCrumbMenu] = useState<CrumbMenuState | null>(null);
  const [previewScroll, setPreviewScroll] = useState(0);
  const crumbMenuRef = useRef<HTMLDivElement>(null);
  const hasFile = document !== null;

  const [fileSymbols, setFileSymbols] = useState<OutlineSymbol[]>([]);

  useEffect(() => {
    if (!document) {
      setFileSymbols([]);
      return;
    }
    let cancelled = false;
    void symbolsForFile(document.path, document.value, document.language)
      .then((symbols) => {
        if (!cancelled) setFileSymbols(symbols);
      })
      .catch(() => {
        if (!cancelled) setFileSymbols([]);
      });
    return () => {
      cancelled = true;
    };
  }, [document?.path, document?.value, document?.language]);

  const activeSymbols = useMemo(() => {
    return getActiveSymbolPath(fileSymbols, document?.cursorLine ?? 1);
  }, [fileSymbols, document?.cursorLine]);

  useEffect(() => {
    if (!crumbMenu) return;
    const close = (event: MouseEvent) => {
      if (crumbMenuRef.current?.contains(event.target as Node)) return;
      setCrumbMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [crumbMenu]);

  useEffect(() => {
    const session = readSession();
    if (session?.preview) setPreviewOpen(true);
    if (session?.split) setSplit(true);
    if (session?.splitOrientation === "down" || session?.splitOrientation === "right") {
      setSplitOrientation(session.splitOrientation);
    }
    if (session?.secondary) setSecondaryPath(session.secondary);
    if (typeof session?.splitRatio === "number") setSplitRatio(session.splitRatio);
    setLayoutReady(true);
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    patchSession({
      preview: previewOpen,
      split,
      splitOrientation,
      secondary: secondaryPath,
      splitRatio,
    });
  }, [layoutReady, previewOpen, split, splitOrientation, secondaryPath, splitRatio]);

  const previewKind =
    document?.language === "markdown" || document?.language === "html"
      ? document.language
      : null;
  const showPreview = previewOpen && previewKind !== null;

  const otherTabs = useMemo(
    () => (activePath ? tabs.filter((tab) => tab.path !== activePath) : []),
    [tabs, activePath],
  );

  useEffect(() => {
    if (!split || !activePath) {
      if (!split) setSecondaryPath(null);
      return;
    }
    setSecondaryPath((current) => {
      if (current && tabs.some((tab) => tab.path === current)) {
        return current;
      }
      if (current && tabs.length === 0) return current;
      return otherTabs[0]?.path ?? activePath;
    });
  }, [split, activePath, tabs, otherTabs]);

  useEffect(() => {
    setSplitEditorListener((mode, path) => {
      if (mode === "close") {
        setSplit(false);
        setSecondaryPath(null);
        return;
      }
      if (mode === "open" && path) {
        void openFile(path).then(() => {
          setSplit(true);
          setSecondaryPath(path);
        });
        return;
      }
      if (!activePath) return;
      if (mode === "right") {
        setSplitOrientation("right");
        setSplit(true);
        setSecondaryPath(activePath);
        return;
      }
      if (mode === "down") {
        setSplitOrientation("down");
        setSplit(true);
        setSecondaryPath(activePath);
        return;
      }
      setSplit((value) => {
        const next = !value;
        if (next) setSecondaryPath(activePath);
        else setSecondaryPath(null);
        return next;
      });
    });
    return () => setSplitEditorListener(null);
  }, [activePath, openFile]);

  const crumbRoot = useMemo(() => {
    if (!document) return rootPath;
    const list = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
    return rootForPath(list, document.path) ?? rootPath;
  }, [document, rootPath, roots]);

  const crumbs = useMemo(
    () =>
      !document
        ? []
        : isVirtualPath(document.path)
          ? [{ name: document.title, path: document.path, kind: "file" as const }]
          : workspaceCrumbs(crumbRoot, document.path),
    [document, crumbRoot],
  );

  const openDirectoryCrumb = async (event: React.MouseEvent, path: string) => {
    event.preventDefault();
    const parent = parentPath(path) ?? path;
    let siblings: CrumbMenuState["siblings"] = [];
    try {
      const nodes = await listDirectory(parent);
      siblings = nodes.map((node) => ({
        name: node.name,
        path: node.path,
        kind: node.kind,
      }));
    } catch {
      siblings = [];
    }
    setCrumbMenu({
      x: event.clientX,
      y: event.clientY + 4,
      kind: "directory",
      path,
      siblings,
    });
  };

  return (
    <section className="editor-area island" aria-label="Editors">
      <EditorTabs />
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          {hasFile ? (
            crumbs.map((crumb, i) => (
              <span key={`${crumb.path}-${i}`} className="editor-area__crumb">
                {crumb.kind === "directory" ? (
                  <button
                    type="button"
                    className="editor-area__crumb-btn"
                    onClick={(event) => void openDirectoryCrumb(event, crumb.path)}
                  >
                    <FileIcon name={crumb.name} kind="directory" size={14} />
                    <span>{crumb.name}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="editor-area__crumb-btn"
                    onClick={(event) =>
                      setCrumbMenu({
                        x: event.clientX,
                        y: event.clientY + 4,
                        kind: "file",
                        path: document!.path,
                      })
                    }
                  >
                    <FileIcon name={crumb.name} kind="file" size={14} />
                    <span>{crumb.name}</span>
                  </button>
                )}
                {i < crumbs.length - 1 ? (
                  <span className="editor-area__crumb-sep">/</span>
                ) : null}
              </span>
            ))
          ) : (
            <span className="editor-area__crumb-muted">No file</span>
          )}
          {hasFile &&
            activeSymbols.map((sym, idx) => (
              <span key={`sym-${sym.line}-${sym.name}-${idx}`} className="editor-area__crumb">
                <span className="editor-area__crumb-sep">&gt;</span>
                <button
                  type="button"
                  className="editor-area__crumb-btn editor-area__crumb-btn--symbol"
                  title={`${sym.kind}: ${sym.name} (line ${sym.line})`}
                  onClick={(e) => {
                    const siblings = getSiblingSymbols(fileSymbols, sym);
                    setCrumbMenu({
                      x: e.clientX,
                      y: e.clientY + 4,
                      kind: "symbol",
                      path: document!.path,
                      symbol: sym,
                      symbolSiblings: siblings,
                    });
                  }}
                >
                  <span className={`outline-panel__kind outline-panel__kind--${sym.kind.toLowerCase()}`}>
                    {kindShort(sym.kind)}
                  </span>
                  <span>{sym.name}</span>
                </button>
              </span>
            ))}
        </div>
        {crumbMenu ? (
          <div
            ref={crumbMenuRef}
            className="editor-area__crumb-menu"
            style={{ left: crumbMenu.x, top: crumbMenu.y }}
            role="menu"
          >
            {crumbMenu.kind === "symbol" && crumbMenu.symbol ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void openFileAt(crumbMenu.path, crumbMenu.symbol!.line, 1);
                    setCrumbMenu(null);
                  }}
                >
                  Go to {crumbMenu.symbol.name} (Line {crumbMenu.symbol.line})
                </button>
                {(crumbMenu.symbolSiblings ?? [])
                  .filter((s) => s.name !== crumbMenu.symbol!.name || s.line !== crumbMenu.symbol!.line)
                  .slice(0, 24)
                  .map((sibling) => (
                    <button
                      key={`${sibling.name}-${sibling.line}`}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCrumbMenu(null);
                        void openFileAt(crumbMenu.path, sibling.line, 1);
                      }}
                    >
                      <span
                        className={`outline-panel__kind outline-panel__kind--${sibling.kind.toLowerCase()}`}
                        style={{ marginRight: 6 }}
                      >
                        {kindShort(sibling.kind)}
                      </span>
                      {sibling.name}
                    </button>
                  ))}
              </>
            ) : crumbMenu.kind === "file" && document ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void revealInExplorer(document.path);
                    setCrumbMenu(null);
                  }}
                >
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(document.path);
                    setCrumbMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      relativeToRoot(crumbRoot, document.path),
                    );
                    setCrumbMenu(null);
                  }}
                >
                  Copy Relative Path
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void revealInExplorer(crumbMenu.path);
                    setCrumbMenu(null);
                  }}
                >
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(crumbMenu.path);
                    setCrumbMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      relativeToRoot(crumbRoot, crumbMenu.path),
                    );
                    setCrumbMenu(null);
                  }}
                >
                  Copy Relative Path
                </button>
                {(crumbMenu.siblings ?? []).slice(0, 24).map((sibling) => (
                  <button
                    key={sibling.path}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCrumbMenu(null);
                      if (sibling.kind === "file") {
                        void openFile(sibling.path).then(() => {
                          /* breadcrumbs follow activePath via workspaceCrumbs */
                        });
                      } else {
                        void revealInExplorer(sibling.path);
                      }
                    }}
                  >
                    {sibling.name}
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
        <div className="editor-area__tools">
          <IconButton
            icon={Search}
            label="Find in file"
            size={15}
            onClick={findInFile}
          />
          {findMatchLabel ? (
            <span className="editor-area__chip" title="Find matches">
              {findMatchLabel}
            </span>
          ) : null}
          {previewKind ? (
            <IconButton
              icon={Eye}
              label={previewKind === "html" ? "Preview HTML" : "Preview markdown"}
              size={15}
              active={showPreview}
              onClick={() => setPreviewOpen((value) => !value)}
            />
          ) : null}
          <IconButton
            icon={Columns2}
            label="Split editor"
            size={15}
            active={split}
            disabled={!hasFile}
            onClick={() => {
              if (!activePath) return;
              setSplitOrientation("right");
              setSplit((value) => {
                const next = !value;
                if (next) setSecondaryPath(activePath);
                else setSecondaryPath(null);
                return next;
              });
            }}
          />
          <IconButton
            icon={Sparkles}
            label={aiOpen ? "Hide AI" : "Ask AI"}
            size={15}
            onClick={toggleAi}
            active={aiOpen}
          />
        </div>
      </div>
      {peek && (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span className="editor-area__peek-title">{peek.title}</span>
            <div className="editor-area__peek-actions">
              {peek.path && (
                <IconButton
                  icon={ExternalLink}
                  label="Jump to definition"
                  size={13}
                  onClick={() => void openFileAt(peek.path, peek.line, peek.column)}
                />
              )}
              <IconButton
                icon={X}
                label="Close peek"
                size={13}
                onClick={clearPeek}
              />
            </div>
          </div>
          <pre className="editor-area__peek-code">{peek.preview}</pre>
        </div>
      )}
      {references && (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span className="editor-area__peek-title">
              {references.length} reference{references.length === 1 ? "" : "s"}
            </span>
            <div className="editor-area__peek-actions">
              <IconButton
                icon={X}
                label="Close references"
                size={13}
                onClick={clearReferences}
              />
            </div>
          </div>
          <ul className="editor-area__refs">
            {references.map((hit) => (
              <li key={`${hit.path}:${hit.line}:${hit.column}:${hit.preview}`}>
                <button
                  type="button"
                  className="editor-area__ref-row"
                  onClick={() => void openFileAt(hit.path, hit.line, hit.column)}
                >
                  <span className="editor-area__ref-loc">
                    {hit.path.split(/[/\\]/).pop()}:{hit.line}
                  </span>
                  <span className="editor-area__ref-preview">{hit.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className={
          showPreview || (split && hasFile)
            ? "editor-area__surface editor-area__surface--split"
            : "editor-area__surface"
        }
        style={
          showPreview || (split && hasFile)
            ? !showPreview && splitOrientation === "down"
              ? { gridTemplateRows: `${splitRatio}fr 6px ${1 - splitRatio}fr` }
              : { gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr` }
            : undefined
        }
      >
        {compareState ? (
          <CompareView
            base={compareState.base}
            head={compareState.head}
            cwd={rootPath ?? ""}
            onClose={closeCompareTab}
          />
        ) : diffTab ? (
          <DiffView
            path={diffTab.path}
            text={diffTab.text}
            head={diffTab.head}
            working={diffTab.working}
            cwd={diffTab.cwd}
            staged={diffTab.staged}
            ignoreSpace={diffTab.ignoreSpace}
          />
        ) : hasFile && activePath ? (
          <>
            <div className="editor-area__pane">
              {isWebviewPath(activePath) ? (
                <ExtensionWebviewView path={activePath} />
              ) : document?.language === "image" ? (
                <ImageView path={activePath} />
              ) : document?.language === "pdf" ? (
                <PdfView path={activePath} />
              ) : (
                <MonacoEditor
                  path={activePath}
                  primary
                  onScrollRatio={
                    showPreview && (previewKind === "markdown" || previewKind === "html")
                      ? setPreviewScroll
                      : undefined
                  }
                />
              )}
            </div>
            {showPreview ? (
              <>
                <ResizeHandle
                  axis="x"
                  label="Resize preview"
                  onResize={(d) => {
                    setSplitRatio((r) => Math.min(0.8, Math.max(0.2, r + d / 900)));
                  }}
                />
                <div className="editor-area__pane">
                  {previewKind === "html" ? (
                    <HtmlPreview
                      source={document?.value ?? ""}
                      filePath={activePath}
                      scrollRatio={previewScroll}
                    />
                  ) : (
                    <MarkdownPreview
                      source={document?.value ?? ""}
                      filePath={activePath}
                      scrollRatio={previewScroll}
                    />
                  )}
                </div>
              </>
            ) : split && secondaryPath ? (
              <>
                <ResizeHandle
                  axis={splitOrientation === "down" ? "y" : "x"}
                  label="Resize split"
                  onResize={(d) => {
                    setSplitRatio((r) =>
                      Math.min(0.8, Math.max(0.2, r + d / 900)),
                    );
                  }}
                />
                <div className="editor-area__pane">
                  <div className="editor-area__secondary-label">
                    <FileIcon
                      name={
                        tabs.find((t) => t.path === secondaryPath)?.title ??
                        "file"
                      }
                      kind="file"
                      size={13}
                    />
                    <select
                      aria-label="Second editor file"
                      value={secondaryPath}
                      onChange={(event) => setSecondaryPath(event.target.value)}
                    >
                      {otherTabs.map((tab) => (
                        <option key={tab.path} value={tab.path}>
                          {tab.title}
                        </option>
                      ))}
                    </select>
                    <IconButton
                      icon={X}
                      label="Close split pane"
                      size={13}
                      onClick={() => {
                        setSplit(false);
                        setSecondaryPath(null);
                      }}
                    />
                  </div>
                  {isWebviewPath(secondaryPath) ? (
                    <ExtensionWebviewView path={secondaryPath} />
                  ) : tabs.find((tab) => tab.path === secondaryPath)?.language === "image" ? (
                    <ImageView path={secondaryPath} />
                  ) : tabs.find((tab) => tab.path === secondaryPath)?.language === "pdf" ? (
                    <PdfView path={secondaryPath} />
                  ) : (
                    <MonacoEditor path={secondaryPath} primary={false} />
                  )}
                </div>
              </>
            ) : split ? (
              <>
                <ResizeHandle
                  axis={splitOrientation === "down" ? "y" : "x"}
                  label="Resize split"
                  onResize={(d) => {
                    setSplitRatio((r) =>
                      Math.min(0.8, Math.max(0.2, r + d / 900)),
                    );
                  }}
                />
                <div className="editor-area__pane editor-area__pane--hint">
                  <div className="editor-area__secondary-label">
                    <span>Split Editor</span>
                    <IconButton
                      icon={X}
                      label="Close split pane"
                      size={13}
                      onClick={() => {
                        setSplit(false);
                        setSecondaryPath(null);
                      }}
                    />
                  </div>
                  <p>Open another file to view side by side.</p>
                </div>
              </>
            ) : null}
          </>
        ) : !rootPath ? (
          <Welcome />
        ) : (
          <EmptyState
            icon={FileCode2}
            title="No editor open"
            description="Pick a file from the explorer, or jump straight to one."
            actions={[{ label: "New File", onClick: openUntitled }]}
            hints={[
              { label: "Go to file", keys: "Ctrl+P" },
              { label: "Command palette", keys: "Ctrl+Shift+P" },
              { label: "Search workspace", keys: "Ctrl+Shift+F" },
              { label: "Toggle terminal", keys: "Ctrl+`" },
            ]}
          />
        )}
      </div>
    </section>
  );
}
