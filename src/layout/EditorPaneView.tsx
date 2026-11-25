import { useState, type CSSProperties, type DragEvent } from "react";
import { Columns2, Rows2, X } from "lucide-react";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { ExtensionWebviewView } from "../extensions/ExtensionWebviewView";
import { ImageView } from "../editor/ImageView";
import { PdfView } from "../editor/PdfView";
import { HexView } from "../editor/HexView";
import { MonacoEditor } from "../editor/MonacoEditor";
import { HtmlPreview } from "../editor/HtmlPreview";
import { MarkdownPreview } from "../editor/MarkdownPreview";
import { CsvTableView } from "../editor/CsvTableView";
import { isWebviewPath } from "../workspace/path";
import { calculateDropEdge, type EditorPaneModel, type PaneDropEdge } from "./paneLayout";
import { getDraggedTab, setDraggedTab } from "../workspace/tabDragBus";
import type { EditorTab } from "../workspace/WorkspaceContext";

export type EditorPaneViewProps = {
  pane: EditorPaneModel;
  isActive: boolean;
  totalPanes: number;
  availableTabs: EditorTab[];
  showPreview?: boolean;
  previewKind?: string | null;
  previewScroll?: number;
  previewValue?: string;
  onScrollRatio?: (ratio: number) => void;
  onFocus: () => void;
  onSelectPath: (path: string) => void;
  onClosePane: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onDropOnEdge: (edge: PaneDropEdge, droppedPath: string) => void;
  style?: CSSProperties;
};

export function EditorPaneView({
  pane,
  isActive,
  totalPanes,
  availableTabs,
  showPreview = false,
  previewKind = null,
  previewScroll = 0,
  previewValue = "",
  onScrollRatio,
  onFocus,
  onSelectPath,
  onClosePane,
  onSplitRight,
  onSplitDown,
  onDropOnEdge,
  style,
}: EditorPaneViewProps) {
  const [dropEdge, setDropEdge] = useState<PaneDropEdge | null>(null);

  const currentTab = pane.path
    ? availableTabs.find((t) => t.path === pane.path) ?? null
    : null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const edge = calculateDropEdge(x, y, 0.25);
    setDropEdge(edge);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropEdge(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedPath =
      e.dataTransfer.getData("application/x-t3d-tab-path") ||
      e.dataTransfer.getData("text/plain") ||
      getDraggedTab();

    const edge = dropEdge ?? "center";
    setDropEdge(null);
    setDraggedTab(null);

    if (droppedPath) {
      onDropOnEdge(edge, droppedPath);
    }
  };

  const renderContent = () => {
    if (!pane.path) {
      return (
        <div className="editor-area__pane editor-area__pane--hint">
          <p>Drop a tab or select a file to view</p>
        </div>
      );
    }

    if (showPreview && previewKind && isActive) {
      return (
        <div className="editor-pane__preview-split" style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <MonacoEditor path={pane.path} primary={isActive} onScrollRatio={onScrollRatio} />
          </div>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, borderLeft: "1px solid var(--border-subtle)" }}>
            {previewKind === "html" ? (
              <HtmlPreview source={previewValue} filePath={pane.path} scrollRatio={previewScroll} />
            ) : previewKind === "csv" || previewKind === "tsv" ? (
              <CsvTableView source={previewValue} filePath={pane.path} delimiter={previewKind === "tsv" ? "\t" : ","} />
            ) : (
              <MarkdownPreview source={previewValue} filePath={pane.path} scrollRatio={previewScroll} />
            )}
          </div>
        </div>
      );
    }

    if (isWebviewPath(pane.path)) {
      return <ExtensionWebviewView path={pane.path} />;
    }

    const lang = currentTab?.language;
    if (lang === "image") {
      return <ImageView path={pane.path} />;
    }
    if (lang === "pdf") {
      return <PdfView path={pane.path} />;
    }
    if (lang === "hex") {
      return <HexView path={pane.path} />;
    }

    return (
      <MonacoEditor
        path={pane.path}
        primary={isActive}
        onScrollRatio={isActive ? onScrollRatio : undefined}
      />
    );
  };

  return (
    <div
      className={`editor-pane ${isActive ? "editor-pane--active" : ""}`}
      style={style}
      onClick={onFocus}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {totalPanes > 1 && (
        <div className="editor-pane__header" onClick={onFocus}>
          <div className="editor-pane__title-wrap">
            <FileIcon name={currentTab?.title ?? "file"} kind="file" size={13} />
            <select
              className="editor-pane__select"
              aria-label="Editor pane file"
              value={pane.path ?? ""}
              onChange={(e) => onSelectPath(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {availableTabs.map((tab) => (
                <option key={tab.path} value={tab.path}>
                  {tab.title}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-pane__actions">
            <IconButton
              icon={Columns2}
              label="Split editor right"
              size={13}
              onClick={(e) => {
                e.stopPropagation();
                onSplitRight();
              }}
            />
            <IconButton
              icon={Rows2}
              label="Split editor down"
              size={13}
              onClick={(e) => {
                e.stopPropagation();
                onSplitDown();
              }}
            />
            <IconButton
              icon={X}
              label="Close pane"
              size={13}
              onClick={(e) => {
                e.stopPropagation();
                onClosePane();
              }}
            />
          </div>
        </div>
      )}

      <div className="editor-pane__content">{renderContent()}</div>

      {dropEdge && (
        <div className={`editor-pane__drop-overlay editor-pane__drop-overlay--${dropEdge}`}>
          <span className="editor-pane__drop-badge">
            {dropEdge === "center" ? "Open in pane" : `Split ${dropEdge.toUpperCase()}`}
          </span>
        </div>
      )}
    </div>
  );
}
