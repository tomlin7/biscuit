import { useRef } from "react";
import { useWorkspace } from "./WorkspaceContext";
import "./EditorTabs.css";

export function EditorTabs() {
  const { tabs, activePath, activateTab, closeTab, moveTab } = useWorkspace();
  const dragPath = useRef<string | null>(null);

  if (tabs.length === 0) {
    return (
      <div className="editor-tabs">
        <div className="editor-tabs__empty">No file</div>
      </div>
    );
  }

  return (
    <div className="editor-tabs" role="tablist" aria-label="Open editors">
      {tabs.map((tab) => {
        const dirty = tab.value !== tab.baseline;
        const active = tab.path === activePath;
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
            <span className="editor-tabs__label">
              {dirty ? `${tab.title} •` : tab.title}
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
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
