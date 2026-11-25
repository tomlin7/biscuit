import type { TreeNode } from "./fsTree";
import { useWorkspace } from "./WorkspaceContext";
import "./FileTree.css";

function TreeRows({
  nodes,
  depth,
}: {
  nodes: TreeNode[];
  depth: number;
}) {
  const { expanded, document, toggleDirectory, openFile } = useWorkspace();

  return (
    <>
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.path);
        const isActive = document?.path === node.path;
        const paddingLeft = 8 + depth * 12;

        if (node.kind === "directory") {
          return (
            <div key={node.path}>
              <button
                type="button"
                className="file-tree__row"
                style={{ paddingLeft }}
                onClick={() => void toggleDirectory(node.path)}
              >
                <span className="file-tree__twist" aria-hidden="true">
                  {isExpanded ? "▾" : "▸"}
                </span>
                <span className="file-tree__label">{node.name}</span>
              </button>
              {isExpanded && node.children ? (
                <TreeRows nodes={node.children} depth={depth + 1} />
              ) : null}
            </div>
          );
        }

        return (
          <button
            key={node.path}
            type="button"
            className={
              isActive ? "file-tree__row file-tree__row--active" : "file-tree__row"
            }
            style={{ paddingLeft }}
            onClick={() => void openFile(node.path)}
          >
            <span className="file-tree__twist file-tree__twist--file" aria-hidden="true" />
            <span className="file-tree__label">{node.name}</span>
          </button>
        );
      })}
    </>
  );
}

export function FileTree() {
  const { rootPath, tree, treeError, busy, openFolder } = useWorkspace();

  if (!rootPath) {
    return (
      <div className="file-tree file-tree--empty">
        <p className="file-tree__hint">No folder open.</p>
        <button type="button" className="file-tree__cta" onClick={() => void openFolder()}>
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="file-tree">
      {treeError ? <p className="file-tree__error">{treeError}</p> : null}
      {busy ? <p className="file-tree__status">Working…</p> : null}
      {tree.length === 0 && !busy ? (
        <p className="file-tree__hint">Folder is empty.</p>
      ) : (
        <TreeRows nodes={tree} depth={0} />
      )}
    </div>
  );
}
