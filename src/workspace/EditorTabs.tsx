import { useRef } from "react";
import { Pin, X } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { FileIcon } from "../ui/FileIcon";
import "./EditorTabs.css";

export function EditorTabs() {
  const { tabs, activePath, activateTab, closeTab, togglePinTab, moveTab } = useWorkspace();
  const dragPath = useRef<string | null>(null);

  if (tabs.length === 0) {
    return <div className="editor-tabs" />;
  }

  return (
    <div className="editor-tabs" role="tablist" aria-label="Open editors">
      {tabs.map((tab) => {
        const dirty = tab.value !== tab.baseline;
        const active = tab.path === activePath;
        const pinned = Boolean(tab.pinned);
        return (
          <div
            key={tab.path}
            className={
              active
                ? "editor-tabs__tab editor-tabs__tab--active"
                : "editor-tabs__tab"
            }
            role="tab"
            aria-selected={active}
            draggable
            onDragStart={() => {
              dragPath.current = tab.path;
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from = dragPath.current;
              if (from) moveTab(from, tab.path);
              dragPath.current = null;
            }}
            onClick={() => activateTab(tab.path)}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                closeTab(tab.path);
              }
            }}
            title={tab.path}
          >
            <button
              type="button"
              className={
                pinned
                  ? "editor-tabs__pin editor-tabs__pin--on"
                  : "editor-tabs__pin"
              }
              aria-label={pinned ? `Unpin ${tab.title}` : `Pin ${tab.title}`}
              title={pinned ? "Unpin" : "Pin"}
              onClick={(event) => {
                event.stopPropagation();
                togglePinTab(tab.path);
              }}
            >
              <Pin size={11} strokeWidth={2} aria-hidden />
            </button>
            <FileIcon name={tab.title} kind="file" size={13} />
            <span className="editor-tabs__label">
              {tab.title}
              {dirty ? <span className="editor-tabs__dirty" aria-label="Unsaved" /> : null}
            </span>
            <button
              type="button"
              className="editor-tabs__close"
              aria-label={`Close ${tab.title}`}
              title="Close"
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.path);
              }}
            >
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
