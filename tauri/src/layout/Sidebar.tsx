import { Filter, Search, X } from "lucide-react";
import { FileTree } from "../workspace/FileTree";
import { SearchPanel } from "../search/SearchPanel";
import { ScmPanel } from "../scm/ScmPanel";
import { ExtensionsPanel } from "../extensions/ExtensionsPanel";
import { DebugPanel } from "../debug/DebugPanel";
import { OutlinePanel } from "../lsp/OutlinePanel";
import { CallHierarchyPanel } from "../lsp/CallHierarchyPanel";
import { TypeHierarchyPanel } from "../lsp/TypeHierarchyPanel";
import { ExtensionWebviewView } from "../extensions/ExtensionWebviewView";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { IconButton } from "../ui/IconButton";
import type { SearchHit } from "../search/workspaceSearch";
import type { GitBranchInfo } from "../scm/ScmPanel";
import type { ExtraSidebarView } from "../extensions/contributions";

export type SidebarMode =
  | "explorer"
  | "search"
  | "outline"
  | "callHierarchy"
  | "typeHierarchy"
  | "scm"
  | "extensions"
  | "debug"
  | (string & {});

type SidebarProps = {
  mode: SidebarMode;
  sidebarViews?: ExtraSidebarView[];
  onModeChange: (mode: SidebarMode) => void;
  onBranch: (info: GitBranchInfo | null) => void;
  treeFilter: string;
  onTreeFilter: (value: string) => void;
  hideDotfiles: boolean;
  onToggleHideDotfiles: () => void;
};

export function Sidebar({
  mode,
  sidebarViews = [],
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

  const activeView = sidebarViews.find(
    (v) =>
      mode === v.id ||
      mode === `extview:${v.extensionId}/${v.id}` ||
      mode === `extview:${v.id}`,
  );

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
          {treeFilter ? (
            <IconButton
              icon={X}
              label="Clear filter"
              size={13}
              onClick={() => onTreeFilter("")}
            />
          ) : null}
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
        {mode === "callHierarchy" ? <CallHierarchyPanel /> : null}
        {mode === "typeHierarchy" ? <TypeHierarchyPanel /> : null}
        {mode === "scm" ? <ScmPanel onBranch={onBranch} /> : null}
        {mode === "extensions" ? <ExtensionsPanel /> : null}
        {mode === "debug" ? <DebugPanel /> : null}
        {activeView ? (
          <div
            className="sidebar__contributed"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--fg-muted)",
              }}
            >
              <span>{activeView.name}</span>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                height: "100%",
              }}
            >
              {activeView.entry ? (
                <ExtensionWebviewView
                  path={`extview:${activeView.extensionId}/${activeView.entry}`}
                />
              ) : (
                <div
                  style={{
                    padding: "16px",
                    color: "var(--fg-dim)",
                    fontSize: "12px",
                  }}
                >
                  {activeView.name}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
