import { useEffect, useRef, useState } from "react";
import { Pin, X } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { FileIcon } from "../ui/FileIcon";
import { relativeToRoot } from "./path";
import { rootForPath } from "../ai/roots";
import "./EditorTabs.css";

type TabContextMenuState = {
  x: number;
  y: number;
  path: string;
};

export function EditorTabs() {
  const {
    tabs,
    activePath,
    activateTab,
    closeTab,
    closeAll,
    closeSavedEditors,
    togglePinTab,
    moveTab,
    rootPath,
    roots,
    revealInExplorer,
  } = useWorkspace();
  const dragPath = useRef<string | null>(null);
  const [menu, setMenu] = useState<TabContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menu]);

  if (tabs.length === 0) {
    return <div className="editor-tabs" />;
  }

  const workspaceRootList = roots.length > 0 ? roots : rootPath ? [rootPath] : [];

  const handleCloseToRight = (targetPath: string) => {
    const idx = tabs.findIndex((t) => t.path === targetPath);
    if (idx === -1) return;
    const toClose = tabs.slice(idx + 1).map((t) => t.path);
    for (const p of toClose) {
      closeTab(p);
    }
  };

  const handleCloseOthers = (targetPath: string) => {
    const toClose = tabs.filter((t) => t.path !== targetPath).map((t) => t.path);
    for (const p of toClose) {
      closeTab(p);
    }
  };

  return (
    <div className="editor-tabs" role="tablist" aria-label="Open editors">
      {tabs.map((tab) => {
        const dirty = tab.value !== tab.baseline;
        const active = tab.path === activePath;
        const pinned = Boolean(tab.pinned);
        return (
          <div
            key={tab.path}
            className={[
              "editor-tabs__tab",
              active ? "editor-tabs__tab--active" : "",
              pinned ? "editor-tabs__tab--pinned" : "",
            ]
              .filter(Boolean)
              .join(" ")}
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
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu({
                x: event.clientX,
                y: event.clientY,
                path: tab.path,
              });
            }}
            title={tab.path}
          >
            <FileIcon name={tab.title} kind="file" size={13} />
            <span className="editor-tabs__label">
              {tab.title}
              {dirty ? <span className="editor-tabs__dirty" aria-label="Unsaved" /> : null}
            </span>
            {pinned ? (
              <button
                type="button"
                className="editor-tabs__pin-indicator"
                title="Unpin tab"
                aria-label={`Unpin ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTab(tab.path);
                }}
              >
                <Pin size={11} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
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

      {/* Tab Context Menu */}
      {menu ? (
        <div
          ref={menuRef}
          className="editor-tabs__context-menu island"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeTab(menu.path);
              setMenu(null);
            }}
          >
            Close
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCloseOthers(menu.path);
              setMenu(null);
            }}
          >
            Close Others
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCloseToRight(menu.path);
              setMenu(null);
            }}
          >
            Close to the Right
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeSavedEditors();
              setMenu(null);
            }}
          >
            Close Saved
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeAll();
              setMenu(null);
            }}
          >
            Close All
          </button>
          <div className="editor-tabs__menu-sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              togglePinTab(menu.path);
              setMenu(null);
            }}
          >
            {tabs.find((t) => t.path === menu.path)?.pinned ? "Unpin Tab" : "Pin Tab"}
          </button>
          <div className="editor-tabs__menu-sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard.writeText(menu.path);
              setMenu(null);
            }}
          >
            Copy Path
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const root = rootForPath(workspaceRootList, menu.path) ?? rootPath;
              void navigator.clipboard.writeText(relativeToRoot(root, menu.path));
              setMenu(null);
            }}
          >
            Copy Relative Path
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void revealInExplorer(menu.path);
              setMenu(null);
            }}
          >
            Reveal in File Explorer
          </button>
        </div>
      ) : null}
    </div>
  );
}
