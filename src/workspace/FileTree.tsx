import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { TreeNode } from "./fsTree";
import { useWorkspace } from "./WorkspaceContext";
import { FileIcon } from "../ui/FileIcon";
import "./FileTree.css";

function filterTree(
  nodes: TreeNode[],
  query: string,
  hideDotfiles: boolean,
): TreeNode[] {
  const q = query.trim().toLowerCase();
  const out: TreeNode[] = [];
  for (const node of nodes) {
    if (hideDotfiles && node.name.startsWith(".")) continue;
    if (node.kind === "directory") {
      const children = filterTree(node.children ?? [], query, hideDotfiles);
      const nameMatch = !q || node.name.toLowerCase().includes(q);
      if (nameMatch || children.length > 0) {
        out.push({
          ...node,
          children: q ? children : (node.children ?? children),
          loaded: true,
        });
      }
    } else if (!q || node.name.toLowerCase().includes(q)) {
      out.push(node);
    }
  }
  return out;
}

function TreeRows({
  nodes,
  depth,
  forceExpand,
}: {
  nodes: TreeNode[];
  depth: number;
  forceExpand: boolean;
}) {
  const { expanded, document, toggleDirectory, openFile } = useWorkspace();

  return (
    <>
      {nodes.map((node) => {
        const isExpanded = forceExpand || expanded.has(node.path);
        const isActive = document?.path === node.path;
        const paddingLeft = 10 + depth * 14;

        if (node.kind === "directory") {
          return (
            <div key={node.path}>
              <button
                type="button"
                className="file-tree__row"
                style={{ paddingLeft }}
                onClick={() => void toggleDirectory(node.path)}
              >
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className={
                    isExpanded
                      ? "file-tree__chevron file-tree__chevron--open"
                      : "file-tree__chevron"
                  }
                  aria-hidden
                />
                <FileIcon name={node.name} kind="directory" open={isExpanded} />
                <span className="file-tree__label">{node.name}</span>
              </button>
              {isExpanded && node.children ? (
                <TreeRows
                  nodes={node.children}
                  depth={depth + 1}
                  forceExpand={forceExpand}
                />
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
            <span className="file-tree__chevron-spacer" aria-hidden />
            <FileIcon name={node.name} kind="file" />
            <span className="file-tree__label">{node.name}</span>
          </button>
        );
      })}
    </>
  );
}

type Props = {
  filter?: string;
  hideDotfiles?: boolean;
};

export function FileTree({ filter = "", hideDotfiles = false }: Props) {
  const { rootPath, tree, treeError, busy, openFolder } = useWorkspace();
  const filtered = useMemo(
    () => filterTree(tree, filter, hideDotfiles),
    [tree, filter, hideDotfiles],
  );
  const forceExpand = filter.trim().length > 0;

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
      {filtered.length === 0 && !busy ? (
        <p className="file-tree__hint">{filter ? "No matches." : "Folder is empty."}</p>
      ) : (
        <TreeRows nodes={filtered} depth={0} forceExpand={forceExpand} />
      )}
    </div>
  );
}
