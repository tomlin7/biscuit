import { useMemo } from "react";
import {
  AlertCircle,
  Bug,
  Filter,
  GitBranch,
  Search,
  Tag,
  Terminal,
} from "lucide-react";
import { FileTree } from "../workspace/FileTree";
import { SearchPanel } from "../search/SearchPanel";
import { ScmPanel } from "../scm/ScmPanel";
import { ExtensionsPanel } from "../extensions/ExtensionsPanel";
import { DebugPanel } from "../debug/DebugPanel";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useLayout } from "./LayoutContext";
import { IconButton } from "../ui/IconButton";
import type { SearchHit } from "../search/workspaceSearch";

export type SidebarMode =
  | "explorer"
  | "search"
  | "scm"
  | "extensions"
  | "debug";

type SidebarProps = {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onBranch: (branch: string | null) => void;
  gitBranch: string | null;
  onToggleTerminal: () => void;
  onOpenProblems: () => void;
  treeFilter: string;
  onTreeFilter: (value: string) => void;
  hideDotfiles: boolean;
  onToggleHideDotfiles: () => void;
};

export function Sidebar({
  mode,
  onModeChange,
  onBranch,
  gitBranch,
  onToggleTerminal,
  onOpenProblems,
  treeFilter,
  onTreeFilter,
  hideDotfiles,
  onToggleHideDotfiles,
}: SidebarProps) {
  const { rootName, openFileAt } = useWorkspace();
  const { setBottomOpen } = useLayout();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  const shortBranch = useMemo(() => {
    if (!gitBranch) return null;
    return gitBranch.length > 12 ? `${gitBranch.slice(0, 11)}…` : gitBranch;
  }, [gitBranch]);

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      {mode === "explorer" ? (
        <div className="sidebar__search">
          <Search size={14} strokeWidth={1.75} className="sidebar__search-icon" aria-hidden />
          <input
            value={treeFilter}
            onChange={(e) => onTreeFilter(e.target.value)}
            placeholder="Search"
            aria-label="Filter files"
          />
          <IconButton
            icon={Filter}
            label={hideDotfiles ? "Showing non-dotfiles (click to show all)" : "Hide dotfiles"}
            size={14}
            active={hideDotfiles}
            onClick={onToggleHideDotfiles}
          />
        </div>
      ) : null}

      {mode !== "explorer" ? (
        <div className="sidebar__modes" role="tablist" aria-label="Sidebar views">
          {(
            [
              ["explorer", "Files"],
              ["search", "Search"],
              ["scm", "Git"],
              ["extensions", "Ext"],
              ["debug", "Debug"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={
                mode === id
                  ? "sidebar__mode sidebar__mode--active"
                  : "sidebar__mode"
              }
              onClick={() => onModeChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="sidebar__content">
        {mode === "explorer" ? (
          <FileTree filter={treeFilter} hideDotfiles={hideDotfiles} />
        ) : null}
        {mode === "search" ? <SearchPanel onOpenHit={onOpenHit} /> : null}
        {mode === "scm" ? <ScmPanel onBranch={onBranch} /> : null}
        {mode === "extensions" ? <ExtensionsPanel /> : null}
        {mode === "debug" ? <DebugPanel /> : null}
      </div>

      <div className="sidebar__dock">
        <button
          type="button"
          className="sidebar__dock-chip"
          title="Source Control"
          onClick={() => onModeChange("scm")}
        >
          <GitBranch size={13} strokeWidth={1.75} aria-hidden />
          <span>{shortBranch ?? "git"}</span>
        </button>
        <button
          type="button"
          className="sidebar__dock-chip"
          title={rootName ?? "Workspace"}
          onClick={() => onModeChange("explorer")}
        >
          <Tag size={13} strokeWidth={1.75} aria-hidden />
          <span>{rootName ? (rootName.length > 10 ? `${rootName.slice(0, 9)}…` : rootName) : "—"}</span>
        </button>
        <IconButton
          icon={Terminal}
          label="Terminal"
          size={14}
          onClick={() => {
            setBottomOpen(true);
            onToggleTerminal();
          }}
        />
        <IconButton
          icon={AlertCircle}
          label="Problems"
          size={14}
          onClick={onOpenProblems}
        />
        <IconButton
          icon={Bug}
          label="Debug"
          size={14}
          active={mode === "debug"}
          onClick={() => onModeChange("debug")}
        />
      </div>
    </aside>
  );
}
