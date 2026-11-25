import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Columns2,
  Eye,
  PanelRightClose,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { HtmlPreview } from "../editor/HtmlPreview";
import { MarkdownPreview } from "../editor/MarkdownPreview";
import { ImageView } from "../editor/ImageView";
import { MonacoEditor } from "../editor/MonacoEditor";
import { DiffView, useDiffTab } from "../scm/DiffView";
import { EditorTabs } from "../workspace/EditorTabs";
import { Welcome } from "../workspace/Welcome";
import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { relativeToRoot, workspaceCrumbs, parentPath } from "../workspace/path";
import { rootForPath } from "../ai/roots";
import { listDirectory } from "../workspace/fsTree";
import { patchSession, readSession } from "../workspace/session";
import { useEditorActions } from "../editor/EditorActions";
import { useLayout } from "./LayoutContext";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { ResizeHandle } from "./ResizeHandle";

type CrumbMenuState = {
  x: number;
  y: number;
  kind: "file" | "directory";
  path: string;
  siblings?: { name: string; path: string; kind: "file" | "directory" }[];
};

export function EditorArea() {
  const { document, rootPath, roots, tabs, activePath, openFile, openFileAt, revealInExplorer } =
    useWorkspace();
  const { findInFile, peek, clearPeek, references, clearReferences, findMatchLabel } =
    useEditorActions();
  const { toggleAi, aiOpen } = useLayout();
  const diffTab = useDiffTab();
  const [split, setSplit] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [secondaryPath, setSecondaryPath] = useState<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [crumbMenu, setCrumbMenu] = useState<CrumbMenuState | null>(null);
  const [previewScroll, setPreviewScroll] = useState(0);
  const crumbMenuRef = useRef<HTMLDivElement>(null);
  const hasFile = document !== null;

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
    if (session?.secondary) setSecondaryPath(session.secondary);
    setLayoutReady(true);
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    patchSession({
      preview: previewOpen,
      split,
      secondary: secondaryPath,
    });
  }, [layoutReady, previewOpen, split, secondaryPath]);

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [document?.path]);

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
      if (current && current !== activePath && tabs.some((tab) => tab.path === current)) {
        return current;
      }
      if (current && tabs.length === 0) return current;
      return otherTabs[0]?.path ?? null;
    });
  }, [split, activePath, tabs, otherTabs]);

  const crumbRoot = useMemo(() => {
    if (!document) return rootPath;
    const list = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
    return rootForPath(list, document.path) ?? rootPath;
  }, [document, rootPath, roots]);

  const crumbs = useMemo(
    () => (document ? workspaceCrumbs(crumbRoot, document.path) : []),
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
        </div>
        {crumbMenu ? (
          <div
            ref={crumbMenuRef}
            className="editor-area__crumb-menu"
            style={{ left: crumbMenu.x, top: crumbMenu.y }}
            role="menu"
          >
            {crumbMenu.kind === "file" && document ? (
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
            icon={Sparkles}
            label="Ask AI"
            size={15}
            onClick={toggleAi}
            active={aiOpen}
          />
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
          <span className="editor-area__chip" title="Local time">
            <Clock size={13} strokeWidth={1.75} aria-hidden />
            {now}
          </span>
          {hasFile ? (
            <span className="editor-area__chip">
              <Zap size={13} strokeWidth={1.75} aria-hidden />
              {languageLabel(document.language)}
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
            onClick={() => setSplit((v) => !v)}
          />
          <IconButton
            icon={PanelRightClose}
            label={aiOpen ? "Hide AI" : "Show AI"}
            size={15}
            onClick={toggleAi}
          />
        </div>
      </div>
      {peek ? (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span>{peek.title}</span>
            {peek.path ? (
              <button
                type="button"
                onClick={() => void openFileAt(peek.path, peek.line, peek.column)}
              >
                Jump
              </button>
            ) : null}
            <button type="button" onClick={clearPeek}>
              Close
            </button>
          </div>
          <pre>{peek.preview}</pre>
        </div>
      ) : null}
      {references ? (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span>{references.length} references</span>
            <button type="button" onClick={clearReferences}>
              Close
            </button>
          </div>
          <ul className="editor-area__refs">
            {references.map((hit) => (
              <li key={`${hit.path}:${hit.line}:${hit.column}:${hit.preview}`}>
                <button
                  type="button"
                  onClick={() => void openFileAt(hit.path, hit.line, hit.column)}
                >
                  <span>
                    {hit.path.split(/[/\\]/).pop()}:{hit.line}
                  </span>
                  <span>{hit.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div
        className={
          showPreview || (split && hasFile)
            ? "editor-area__surface editor-area__surface--split"
            : "editor-area__surface"
        }
        style={
          showPreview || (split && hasFile)
            ? { gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr` }
            : undefined
        }
      >
        {hasFile && activePath ? (
          diffTab ? (
            <DiffView
              path={diffTab.path}
              text={diffTab.text}
              head={diffTab.head}
              working={diffTab.working}
              cwd={diffTab.cwd}
              staged={diffTab.staged}
              ignoreSpace={diffTab.ignoreSpace}
            />
          ) : (
          <>
            <div className="editor-area__pane">
              {document?.language === "image" ? (
                <ImageView path={activePath} />
              ) : (
                <MonacoEditor
                  path={activePath}
                  primary
                  onScrollRatio={showPreview && previewKind === "markdown" ? setPreviewScroll : undefined}
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
                    <HtmlPreview source={document?.value ?? ""} filePath={activePath} />
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
                  axis="x"
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
                  </div>
                  {tabs.find((tab) => tab.path === secondaryPath)?.language === "image" ? (
                    <ImageView path={secondaryPath} />
                  ) : (
                    <MonacoEditor path={secondaryPath} primary={false} />
                  )}
                </div>
              </>
            ) : split ? (
              <>
                <ResizeHandle
                  axis="x"
                  label="Resize split"
                  onResize={(d) => {
                    setSplitRatio((r) =>
                      Math.min(0.8, Math.max(0.2, r + d / 900)),
                    );
                  }}
                />
                <div className="editor-area__pane editor-area__pane--hint">
                  <p>Open another file to split.</p>
                </div>
              </>
            ) : null}
          </>
          )
        ) : !rootPath ? (
          <Welcome />
        ) : (
          <div className="editor-area__empty">
            <p className="editor-area__empty-title">T3D</p>
            <p className="editor-area__empty-hint">Select a file in the explorer to edit.</p>
          </div>
        )}
      </div>
    </section>
  );
}
