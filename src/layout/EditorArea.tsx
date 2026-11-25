import { useMemo } from "react";
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

export function EditorArea() {
  const { document, rootPath, rootName } = useWorkspace();
  const { findInFile } = useEditorActions();
  const { toggleAi, aiOpen, toggleSidebar } = useLayout();
  const hasFile = document !== null;

  const crumbs = useMemo(() => {
    if (!document) return [];
    const parts = document.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const leaf = parts[parts.length - 1] ?? document.title;
    const parent = parts.length > 1 ? parts[parts.length - 2] : rootName;
    return parent ? [parent, leaf] : [leaf];
  }, [document, rootName]);

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [document?.path]);

  return (
    <section className="editor-area island" aria-label="Editors">
      <EditorTabs />
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          {hasFile ? (
            crumbs.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="editor-area__crumb">
                {i === crumbs.length - 1 ? (
                  <FileIcon name={crumb} kind="file" size={13} />
                ) : (
                  <FileIcon name={crumb} kind="directory" size={13} />
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
          <IconButton icon={Sparkles} label="Ask AI about file" size={14} onClick={toggleAi} active={aiOpen} />
          <IconButton icon={Search} label="Find in file" size={14} onClick={findInFile} />
          <span className="editor-area__chip" title="Local time">
            <Clock size={12} strokeWidth={1.75} aria-hidden />
            {now}
          </span>
          {hasFile ? (
            <span className="editor-area__chip">
              <Zap size={12} strokeWidth={1.75} aria-hidden />
              {languageLabel(document.language)}
            </span>
          ) : null}
          <IconButton icon={Columns2} label="Toggle sidebar" size={14} onClick={toggleSidebar} />
          <IconButton
            icon={PanelRightClose}
            label={aiOpen ? "Hide AI" : "Show AI"}
            size={14}
            onClick={toggleAi}
          />
        </div>
      </div>
      <div className="editor-area__surface">
        {hasFile ? (
          <MonacoEditor />
        ) : (
          <div className="editor-area__empty">
            <h1>T3D</h1>
            <p>
              {rootPath
                ? "Select a text file in the explorer to edit."
                : "Open a folder to start editing."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
