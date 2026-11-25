import { useMemo, useState } from "react";
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
import { EditorTabs } from "../workspace/EditorTabs";
import { Welcome } from "../workspace/Welcome";
import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { workspaceCrumbs } from "../workspace/path";
import { useEditorActions } from "../editor/EditorActions";
import { useLayout } from "./LayoutContext";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { ResizeHandle } from "./ResizeHandle";

export function EditorArea() {
  const { document, rootPath, tabs, activePath, openFileAt, revealInExplorer } = useWorkspace();
  const { findInFile, peek, clearPeek, references, clearReferences } = useEditorActions();
  const { toggleAi, aiOpen } = useLayout();
  const [split, setSplit] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const hasFile = document !== null;

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [document?.path]);

  const previewKind =
    document?.language === "markdown" || document?.language === "html"
      ? document.language
      : null;
  const showPreview = previewOpen && previewKind !== null;

  const secondaryPath = useMemo(() => {
    if (!split || !activePath) return null;
    const other = tabs.find((t) => t.path !== activePath);
    return other?.path ?? activePath;
  }, [split, tabs, activePath]);

  const crumbs = useMemo(
    () => (document ? workspaceCrumbs(rootPath, document.path) : []),
    [document, rootPath],
  );

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
                    onClick={() => void revealInExplorer(crumb.path)}
                  >
                    <FileIcon name={crumb.name} kind="directory" size={14} />
                    <span>{crumb.name}</span>
                  </button>
                ) : (
                  <>
                    <FileIcon name={crumb.name} kind="file" size={14} />
                    <span>{crumb.name}</span>
                  </>
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
          (showPreview || (split && secondaryPath))
            ? "editor-area__surface editor-area__surface--split"
            : "editor-area__surface"
        }
        style={
          showPreview || (split && secondaryPath)
            ? { gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr` }
            : undefined
        }
      >
        {hasFile && activePath ? (
          <>
            <div className="editor-area__pane">
              {document?.language === "image" ? (
                <ImageView path={activePath} />
              ) : (
                <MonacoEditor path={activePath} primary />
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
                    <MarkdownPreview source={document?.value ?? ""} />
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
                    {tabs.find((t) => t.path === secondaryPath)?.title}
                  </div>
                  {tabs.find((tab) => tab.path === secondaryPath)?.language === "image" ? (
                    <ImageView path={secondaryPath} />
                  ) : (
                    <MonacoEditor path={secondaryPath} primary={false} />
                  )}
                </div>
              </>
            ) : null}
          </>
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
