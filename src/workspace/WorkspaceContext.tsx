import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { listDirectory, type TreeNode } from "./fsTree";
import { basename, isProbablyTextFile, languageFromPath } from "./path";

export type OpenDocument = {
  path: string | null;
  title: string;
  language: string;
  value: string;
  baseline: string;
};

export type WorkspaceState = {
  rootPath: string | null;
  rootName: string | null;
  tree: TreeNode[];
  expanded: Set<string>;
  treeError: string | null;
  busy: boolean;
  document: OpenDocument;
  dirty: boolean;
  cursorLine: number;
  cursorColumn: number;
  openFolder: () => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  setValue: (value: string) => void;
  setCursor: (line: number, column: number) => void;
  save: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

const EMPTY_DOC: OpenDocument = {
  path: null,
  title: "untitled",
  language: "plaintext",
  value: "",
  baseline: "",
};

function updateTreeNode(
  nodes: TreeNode[],
  path: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === path) return updater(node);
    if (node.kind === "directory" && node.children?.length) {
      return {
        ...node,
        children: updateTreeNode(node.children, path, updater),
      };
    }
    return node;
  });
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [treeError, setTreeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [document, setDocument] = useState<OpenDocument>(EMPTY_DOC);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);

  const openFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Folder",
    });
    if (selected === null) return;

    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;

    setBusy(true);
    setTreeError(null);
    try {
      const children = await listDirectory(path);
      setRootPath(path);
      setTree(children);
      setExpanded(new Set());
      setDocument(EMPTY_DOC);
      setCursorLine(1);
      setCursorColumn(1);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleDirectory = useCallback(
    async (path: string) => {
      if (expanded.has(path)) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
        return;
      }

      setExpanded((prev) => new Set(prev).add(path));

      let needsLoad = false;
      const check = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.path === path) {
            needsLoad = !node.loaded;
            return;
          }
          if (node.children) check(node.children);
        }
      };
      check(tree);
      if (!needsLoad) return;

      setBusy(true);
      setTreeError(null);
      try {
        const children = await listDirectory(path);
        setTree((current) =>
          updateTreeNode(current, path, (node) => ({
            ...node,
            children,
            loaded: true,
          })),
        );
      } catch (err) {
        setTreeError(err instanceof Error ? err.message : String(err));
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      } finally {
        setBusy(false);
      }
    },
    [expanded, tree],
  );

  const openFile = useCallback(async (path: string) => {
    if (!isProbablyTextFile(path)) {
      setTreeError(`Cannot open binary file: ${basename(path)}`);
      return;
    }

    setBusy(true);
    setTreeError(null);
    try {
      const value = await readTextFile(path);
      setDocument({
        path,
        title: basename(path),
        language: languageFromPath(path),
        value,
        baseline: value,
      });
      setCursorLine(1);
      setCursorColumn(1);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const setValue = useCallback((value: string) => {
    setDocument((doc) => ({ ...doc, value }));
  }, []);

  const setCursor = useCallback((line: number, column: number) => {
    setCursorLine(line);
    setCursorColumn(column);
  }, []);

  const save = useCallback(async () => {
    if (!document.path) return;
    setBusy(true);
    setTreeError(null);
    try {
      await writeTextFile(document.path, document.value);
      setDocument((doc) => ({ ...doc, baseline: doc.value }));
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [document.path, document.value]);

  const state = useMemo<WorkspaceState>(
    () => ({
      rootPath,
      rootName: rootPath ? basename(rootPath) : null,
      tree,
      expanded,
      treeError,
      busy,
      document,
      dirty: document.value !== document.baseline,
      cursorLine,
      cursorColumn,
      openFolder,
      toggleDirectory,
      openFile,
      setValue,
      setCursor,
      save,
    }),
    [
      rootPath,
      tree,
      expanded,
      treeError,
      busy,
      document,
      cursorLine,
      cursorColumn,
      openFolder,
      toggleDirectory,
      openFile,
      setValue,
      setCursor,
      save,
    ],
  );

  return (
    <WorkspaceContext.Provider value={state}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
