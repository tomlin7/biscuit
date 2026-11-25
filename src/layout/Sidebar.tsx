import { FileTree } from "../workspace/FileTree";
import { SearchPanel } from "../search/SearchPanel";
import { ScmPanel } from "../scm/ScmPanel";
import { ExtensionsPanel } from "../extensions/ExtensionsPanel";
import { DebugPanel } from "../debug/DebugPanel";
import { useWorkspace } from "../workspace/WorkspaceContext";
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
};

const MODES: Array<[SidebarMode, string]> = [
  ["explorer", "Explorer"],
  ["search", "Search"],
  ["scm", "Git"],
  ["extensions", "Ext"],
  ["debug", "Debug"],
];

export function Sidebar({ mode, onModeChange, onBranch }: SidebarProps) {
  const { rootName, openFileAt } = useWorkspace();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      <div className="sidebar__modes" role="tablist" aria-label="Sidebar views">
        {MODES.map(([id, label]) => (
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
      {mode === "explorer" ? (
        <>
          <div className="sidebar__header">
            <span className="sidebar__title">{rootName ?? "Explorer"}</span>
          </div>
          <FileTree />
        </>
      ) : null}
      {mode === "search" ? <SearchPanel onOpenHit={onOpenHit} /> : null}
      {mode === "scm" ? <ScmPanel onBranch={onBranch} /> : null}
      {mode === "extensions" ? (
        <>
          <div className="sidebar__header">
            <span className="sidebar__title">Extensions</span>
          </div>
          <ExtensionsPanel />
        </>
      ) : null}
      {mode === "debug" ? (
        <>
          <div className="sidebar__header">
            <span className="sidebar__title">Run and Debug</span>
          </div>
          <DebugPanel />
        </>
      ) : null}
    </aside>
  );
}
