import { useMemo, useState } from "react";
import {
  Clock,
  Columns2,
  PanelRightClose,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { MonacoEditor } from "../editor/MonacoEditor";
import { EditorTabs } from "../workspace/EditorTabs";
import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useEditorActions } from "../editor/EditorActions";
import { useLayout } from "./LayoutContext";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { ResizeHandle } from "./ResizeHandle";

export function EditorArea() {
  const { document, rootPath, rootName, tabs, activePath } = useWorkspace();
  const { findInFile } = useEditorActions();
  const { toggleAi, aiOpen } = useLayout();
  const [split, setSplit] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const hasFile = document !== null;

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [document?.path]);

  const secondaryPath = useMemo(() => {
    if (!split || !activePath) return null;
    const other = tabs.find((t) => t.path !== activePath);
    return other?.path ?? activePath;
  }, [split, tabs, activePath]);

  const crumbs = useMemo(() => {
    if (!document) return [];
    const parts = document.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const leaf = parts[parts.length - 1] ?? document.title;
    const parent = parts.length > 1 ? parts[parts.length - 2] : rootName;
    return parent ? [parent, leaf] : [leaf];
  }, [document, rootName]);

  return (
    <section className="editor-area island" aria-label="Editors">
      <EditorTabs />
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          {hasFile ? (
            crumbs.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="editor-area__crumb">
                {i === crumbs.length - 1 ? (
                  <FileIcon name={crumb} kind="file" size={14} />
                ) : (
                  <FileIcon name={crumb} kind="directory" size={14} />
                )}
                <span>{crumb}</span>
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
      <div
        className={
          split && secondaryPath
            ? "editor-area__surface editor-area__surface--split"
            : "editor-area__surface"
        }
        style={
          split && secondaryPath
            ? { gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr` }
            : undefined
        }
      >
        {hasFile && activePath ? (
          <>
            <div className="editor-area__pane">
              <MonacoEditor path={activePath} primary />
            </div>
            {split && secondaryPath ? (
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
                  <MonacoEditor path={secondaryPath} primary={false} />
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="editor-area__empty">
            <p className="editor-area__empty-title">T3D</p>
            <p className="editor-area__empty-hint">
              {rootPath
                ? "Select a file in the explorer to edit."
                : "Open a folder to start editing."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
