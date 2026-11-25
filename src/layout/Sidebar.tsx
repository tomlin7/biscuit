import { useMemo } from "react";
import {
  AlertCircle,
  Bug,
  Filter,
  FolderTree,
  GitBranch,
  LayoutGrid,
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
import { useDiagnostics } from "../lsp/DiagnosticsContext";
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
  const { problems } = useDiagnostics();

  const onOpenHit = (hit: SearchHit) => {
    void openFileAt(hit.path, hit.line, hit.column);
  };

  const shortBranch = useMemo(() => {
    if (!gitBranch) return null;
    return gitBranch.length > 12 ? `${gitBranch.slice(0, 11)}…` : gitBranch;
  }, [gitBranch]);

  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warnCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <aside className="sidebar island" aria-label="Sidebar">
      <div className="sidebar__top">
        <div className="sidebar__search">
          <Search
            size={14}
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
            size={14}
            active={mode === "explorer"}
            onClick={() => onModeChange("explorer")}
          />
          <IconButton
            icon={Search}
            label="Search"
            size={14}
            active={mode === "search"}
            onClick={() => onModeChange("search")}
          />
          <IconButton
            icon={GitBranch}
            label="Source Control"
            size={14}
            active={mode === "scm"}
            onClick={() => onModeChange("scm")}
          />
          <IconButton
            icon={LayoutGrid}
            label="Extensions"
            size={14}
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
            size={14}
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
          <span>
            {rootName
              ? rootName.length > 10
                ? `${rootName.slice(0, 9)}…`
                : rootName
              : "—"}
          </span>
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
        <button
          type="button"
          className="sidebar__dock-count"
          title="Problems"
          onClick={onOpenProblems}
        >
          <AlertCircle size={13} strokeWidth={1.75} aria-hidden />
          <span className="sidebar__dock-count-err">{errorCount}</span>
          <span className="sidebar__dock-count-warn">{warnCount}</span>
        </button>
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
