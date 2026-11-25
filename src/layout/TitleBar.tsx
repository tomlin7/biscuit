import { Folder, Play, Plus, Sparkles, UserRound } from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useLayout } from "./LayoutContext";
import { useDebug } from "../debug/DebugContext";
import { IconButton } from "../ui/IconButton";

type TitleBarProps = {
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
};

export function TitleBar({ onOpenPalette, onOpenSettings }: TitleBarProps) {
  const { rootName, openFolder, activePath, busy } = useWorkspace();
  const { aiOpen, toggleAi } = useLayout();
  const { startSession } = useDebug();

  return (
    <header className="titlebar" role="banner" data-tauri-drag-region>
      <div className="titlebar__left" />

      <button
        type="button"
        className="titlebar__project"
        title="Open Folder"
        onClick={() => void openFolder()}
        disabled={busy}
      >
        <Folder size={14} strokeWidth={1.75} aria-hidden />
        <span className="titlebar__project-name">
          {rootName ?? "Open folder"}
        </span>
        <Plus size={14} strokeWidth={1.75} aria-hidden />
      </button>

      <div className="titlebar__right">
        <IconButton
          icon={Play}
          label="Run current file"
          disabled={!activePath}
          onClick={() => {
            if (activePath) void startSession(activePath);
          }}
        />
        <IconButton
          icon={Sparkles}
          label="Toggle AI"
          active={aiOpen}
          onClick={toggleAi}
        />
        <IconButton
          icon={UserRound}
          label="Settings"
          onClick={onOpenSettings ?? onOpenPalette}
        />
      </div>
    </header>
  );
}
