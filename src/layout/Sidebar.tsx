import { Filter, Search } from "lucide-react";
import { FileTree } from "../workspace/FileTree";
import { SearchPanel } from "../search/SearchPanel";
import { ScmPanel } from "../scm/ScmPanel";
import { ExtensionsPanel } from "../extensions/ExtensionsPanel";
import { DebugPanel } from "../debug/DebugPanel";
import { OutlinePanel } from "../lsp/OutlinePanel";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { IconButton } from "../ui/IconButton";
import type { SearchHit } from "../search/workspaceSearch";

export type SidebarMode =
  | "explorer"
  | "search"
  | "outline"
  | "scm"
  | "extensions"
  | "debug";

type SidebarProps = {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onBranch: (branch: string | null) => void;
  treeFilter: string;
  onTreeFilter: (value: string) => void;
  hideDotfiles: boolean;
  onToggleHideDotfiles: () => void;
};

export function Sidebar({
  mode,
  onBranch,
  treeFilter,
  onTreeFilter,
  hideDotfiles,
  onToggleHideDotfiles,
}: SidebarProps) {
  const { openFileAt } = useWorkspace();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      {mode === "explorer" ? (
        <div className="sidebar__search">
          <Search
            size={15}
            strokeWidth={1.75}
            className="sidebar__search-icon"
            aria-hidden
          />
          <input
            value={treeFilter}
            onChange={(e) => onTreeFilter(e.target.value)}
            placeholder="Filter"
            aria-label="Filter files"
          />
          <IconButton
            icon={Filter}
            label={hideDotfiles ? "Show all files" : "Hide dotfiles"}
            size={15}
            active={hideDotfiles}
            onClick={onToggleHideDotfiles}
          />
        </div>
      ) : null}

      <div className="sidebar__content">
        {mode === "explorer" ? (
          <FileTree filter={treeFilter} hideDotfiles={hideDotfiles} />
        ) : null}
        {mode === "search" ? <SearchPanel onOpenHit={onOpenHit} /> : null}
        {mode === "outline" ? <OutlinePanel /> : null}
        {mode === "scm" ? <ScmPanel onBranch={onBranch} /> : null}
        {mode === "extensions" ? <ExtensionsPanel /> : null}
        {mode === "debug" ? <DebugPanel /> : null}
      </div>
    </aside>
  );
}
