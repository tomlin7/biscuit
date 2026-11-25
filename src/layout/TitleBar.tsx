import { useEffect, useState } from "react";
import {
  Blocks,
  Bug,
  Copy,
  Folder,
  FolderTree,
  GitBranch,
  ListTree,
  Minus,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useLayout } from "./LayoutContext";
import { useDebug } from "../debug/DebugContext";
import { IconButton } from "../ui/IconButton";
import type { SidebarMode } from "./Sidebar";

type TitleBarProps = {
  sidebarOpen?: boolean;
  sidebarMode?: SidebarMode;
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onToggleSidebarMode?: (mode: SidebarMode) => void;
  onShowExplorer?: () => void;
  onShowSearch?: () => void;
  onShowOutline?: () => void;
  onShowScm?: () => void;
  onShowDebug?: () => void;
  onShowExtensions?: () => void;
};

const noDrag = { "data-tauri-drag-region": "false" } as const;

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!inTauri()) return;
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void win.isMaximized().then(setMaximized);
    void win.onResized(() => {
      void win.isMaximized().then(setMaximized);
    }).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);

  if (!inTauri()) return null;

  const win = getCurrentWindow();

  return (
    <div className="titlebar__window-controls">
      <button
        type="button"
        className="titlebar__window-btn"
        aria-label="Minimize"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => void win.minimize()}
        {...noDrag}
      >
        <Minus size={14} strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="titlebar__window-btn"
        aria-label={maximized ? "Restore" : "Maximize"}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => void win.toggleMaximize()}
        {...noDrag}
      >
        {maximized ? (
          <Copy size={12} strokeWidth={1.75} aria-hidden />
        ) : (
          <Square size={12} strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <button
        type="button"
        className="titlebar__window-btn titlebar__window-btn--close"
        aria-label="Close"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => void win.close()}
        {...noDrag}
      >
        <X size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

export function TitleBar({
  sidebarOpen = true,
  sidebarMode = "explorer",
  onOpenSettings,
  onToggleSidebarMode,
  onShowExplorer,
  onShowSearch,
  onShowOutline,
  onShowScm,
  onShowDebug,
  onShowExtensions,
}: TitleBarProps) {
  const { rootName, openFolder, activePath, busy } = useWorkspace();
  const { aiOpen, toggleAi } = useLayout();
  const { startSession } = useDebug();

  const handleModeClick = (mode: SidebarMode, fallback?: () => void) => {
    if (onToggleSidebarMode) {
      onToggleSidebarMode(mode);
    } else if (fallback) {
      fallback();
    }
  };

  return (
    <header className="titlebar" role="banner" data-tauri-drag-region="deep">
      <div className="titlebar__left">
        <IconButton
          icon={FolderTree}
          label="Explorer"
          size={15}
          active={sidebarOpen && sidebarMode === "explorer"}
          onClick={() => handleModeClick("explorer", onShowExplorer)}
          {...noDrag}
        />
        <IconButton
          icon={Search}
          label="Search files"
          size={15}
          active={sidebarOpen && sidebarMode === "search"}
          onClick={() => handleModeClick("search", onShowSearch)}
          {...noDrag}
        />
        <IconButton
          icon={ListTree}
          label="Outline"
          size={15}
          active={sidebarOpen && sidebarMode === "outline"}
          onClick={() => handleModeClick("outline", onShowOutline)}
          {...noDrag}
        />
        <IconButton
          icon={GitBranch}
          label="Source control"
          size={15}
          active={sidebarOpen && sidebarMode === "scm"}
          onClick={() => handleModeClick("scm", onShowScm)}
          {...noDrag}
        />
        <IconButton
          icon={Bug}
          label="Run and Debug"
          size={15}
          active={sidebarOpen && sidebarMode === "debug"}
          onClick={() => handleModeClick("debug", onShowDebug)}
          {...noDrag}
        />
        <IconButton
          icon={Blocks}
          label="Extensions"
          size={15}
          active={sidebarOpen && sidebarMode === "extensions"}
          onClick={() => handleModeClick("extensions", onShowExtensions)}
          {...noDrag}
        />
      </div>

      <button
        type="button"
        className="titlebar__project"
        title="Open Folder"
        onClick={() => void openFolder()}
        disabled={busy}
        {...noDrag}
      >
        <Folder size={14} strokeWidth={1.75} aria-hidden />
        <span className="titlebar__project-name">
          {rootName ?? "Open folder"}
        </span>
        <Plus size={14} strokeWidth={1.75} aria-hidden />
      </button>

      <div className="titlebar__actions">
        <IconButton
          icon={Play}
          label="Run current file"
          size={15}
          disabled={!activePath}
          onClick={() => {
            if (activePath) void startSession(activePath);
          }}
          {...noDrag}
        />
        <IconButton
          icon={Sparkles}
          label="Toggle AI"
          size={15}
          active={aiOpen}
          onClick={toggleAi}
          {...noDrag}
        />
        <IconButton
          icon={Settings}
          label="Settings"
          size={15}
          onClick={onOpenSettings}
          {...noDrag}
        />
        <WindowControls />
      </div>
    </header>
  );
}
