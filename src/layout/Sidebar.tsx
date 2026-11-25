import { FileTree } from "../workspace/FileTree";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function Sidebar() {
  const { rootName } = useWorkspace();

  return (
    <aside className="sidebar island" aria-label="Explorer">
      <div className="sidebar__header">
        <span className="sidebar__title">{rootName ?? "Explorer"}</span>
      </div>
      <FileTree />
    </aside>
  );
}
