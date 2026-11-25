import {
  Bug,
  Filter,
  FolderTree,
  GitBranch,
  LayoutGrid,
  Search,
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
  onToggleTerminal: () => void;
  treeFilter: string;
  onTreeFilter: (value: string) => void;
  hideDotfiles: boolean;
  onToggleHideDotfiles: () => void;
};

export function Sidebar({
  mode,
  onModeChange,
  onBranch,
  onToggleTerminal,
  treeFilter,
  onTreeFilter,
  hideDotfiles,
  onToggleHideDotfiles,
}: SidebarProps) {
  const { openFileAt } = useWorkspace();
  const { setBottomOpen } = useLayout();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      <div className="sidebar__top">
        <div className="sidebar__search">
          <Search
            size={16}
            strokeWidth={1.75}
            className="sidebar__search-icon"
            aria-hidden
          />
          <input
            value={treeFilter}
            onChange={(e) => {
              onTreeFilter(e.target.value);
              if (mode !== "explorer" && mode !== "search") {
                onModeChange("explorer");
              }
            }}
            placeholder="Search"
            aria-label="Filter files"
            onFocus={() => {
              if (mode !== "search" && treeFilter.trim()) onModeChange("search");
            }}
          />
        </div>
        <div className="sidebar__view-icons">
          <IconButton
            icon={FolderTree}
            label="Explorer"
            size={16}
            active={mode === "explorer"}
            onClick={() => onModeChange("explorer")}
          />
          <IconButton
            icon={Search}
            label="Search"
            size={16}
            active={mode === "search"}
            onClick={() => onModeChange("search")}
          />
          <IconButton
            icon={GitBranch}
            label="Source Control"
            size={16}
            active={mode === "scm"}
            onClick={() => onModeChange("scm")}
          />
          <IconButton
            icon={LayoutGrid}
            label="Extensions"
            size={16}
            active={mode === "extensions"}
            onClick={() => onModeChange("extensions")}
          />
          <IconButton
            icon={Filter}
            label={
              hideDotfiles
                ? "Showing non-dotfiles (click to show all)"
                : "Hide dotfiles"
            }
            size={16}
            active={hideDotfiles}
            onClick={onToggleHideDotfiles}
          />
        </div>
      </div>

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
        <IconButton
          icon={Terminal}
          label="Terminal"
          size={16}
          onClick={() => {
            setBottomOpen(true);
            onToggleTerminal();
          }}
        />
        <IconButton
          icon={Bug}
          label="Debug"
          size={16}
          active={mode === "debug"}
          onClick={() => onModeChange("debug")}
        />
      </div>
    </aside>
  );
}
