import { FileTree } from "../workspace/FileTree";
import { SearchPanel } from "../search/SearchPanel";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { SearchHit } from "../search/workspaceSearch";

export type SidebarMode = "explorer" | "search";

type SidebarProps = {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
};

export function Sidebar({ mode, onModeChange }: SidebarProps) {
  const { rootName, openFileAt } = useWorkspace();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      <div className="sidebar__modes" role="tablist" aria-label="Sidebar views">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "explorer"}
          className={
            mode === "explorer"
              ? "sidebar__mode sidebar__mode--active"
              : "sidebar__mode"
          }
          onClick={() => onModeChange("explorer")}
        >
          Explorer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "search"}
          className={
            mode === "search"
              ? "sidebar__mode sidebar__mode--active"
              : "sidebar__mode"
          }
          onClick={() => onModeChange("search")}
        >
          Search
        </button>
      </div>
      {mode === "explorer" ? (
        <>
          <div className="sidebar__header">
            <span className="sidebar__title">{rootName ?? "Explorer"}</span>
          </div>
          <FileTree />
        </>
      ) : (
        <SearchPanel onOpenHit={onOpenHit} />
      )}
    </aside>
  );
}
