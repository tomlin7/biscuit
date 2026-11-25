import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { listDirectory, type TreeNode } from "./fsTree";
import { basename, isProbablyTextFile, languageFromPath } from "./path";

export type EditorTab = {
  path: string;
  title: string;
  language: string;
  value: string;
  baseline: string;
  cursorLine: number;
  cursorColumn: number;
};

export type RevealTarget = {
  path: string;
  line: number;
  column: number;
  token: number;
};

export type WorkspaceState = {
  rootPath: string | null;
  rootName: string | null;
  tree: TreeNode[];
  expanded: Set<string>;
  treeError: string | null;
  busy: boolean;
  tabs: EditorTab[];
  activePath: string | null;
  document: EditorTab | null;
  dirty: boolean;
  cursorLine: number;
  cursorColumn: number;
  revealTarget: RevealTarget | null;
  openFolder: () => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openFileAt: (path: string, line: number, column: number) => Promise<void>;
  activateTab: (path: string) => void;
  closeTab: (path: string) => void;
  moveTab: (fromPath: string, toPath: string) => void;
  setValue: (value: string) => void;
  setValueAt: (path: string, value: string) => void;
  setCursor: (line: number, column: number) => void;
  clearRevealTarget: () => void;
  save: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

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

function isDirty(tab: EditorTab): boolean {
  return tab.value !== tab.baseline;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [treeError, setTreeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<RevealTarget | null>(null);
  const revealToken = useRef(0);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  const document = useMemo(
    () => tabs.find((tab) => tab.path === activePath) ?? null,
    [tabs, activePath],
  );

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
      setTabs([]);
      setActivePath(null);
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

    if (tabsRef.current.some((tab) => tab.path === path)) {
      setActivePath(path);
      return;
    }

    setBusy(true);
    setTreeError(null);
    try {
      const value = await readTextFile(path);
      const next: EditorTab = {
        path,
        title: basename(path),
        language: languageFromPath(path),
        value,
        baseline: value,
        cursorLine: 1,
        cursorColumn: 1,
      };
      setTabs((current) => {
        if (current.some((tab) => tab.path === path)) return current;
        return [...current, next];
      });
      setActivePath(path);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const openFileAt = useCallback(
    async (path: string, line: number, column: number) => {
      await openFile(path);
      revealToken.current += 1;
      setRevealTarget({
        path,
        line,
        column,
        token: revealToken.current,
      });
    },
    [openFile],
  );

  const clearRevealTarget = useCallback(() => {
    setRevealTarget(null);
  }, []);

  const activateTab = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    const tab = tabsRef.current.find((t) => t.path === path);
    if (tab && isDirty(tab)) {
      const ok = window.confirm(
        `Close ${tab.title} without saving? Unsaved changes will be lost.`,
      );
      if (!ok) return;
    }

    setTabs((current) => {
      const index = current.findIndex((t) => t.path === path);
      if (index < 0) return current;
      const next = current.filter((t) => t.path !== path);

      setActivePath((active) => {
        if (active !== path) return active;
        if (next.length === 0) return null;
        return next[Math.min(index, next.length - 1)].path;
      });

      return next;
    });
  }, []);

  const moveTab = useCallback((fromPath: string, toPath: string) => {
    if (fromPath === toPath) return;
    setTabs((current) => {
      const fromIndex = current.findIndex((t) => t.path === fromPath);
      const toIndex = current.findIndex((t) => t.path === toPath);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const setValue = useCallback((value: string) => {
    const path = activePathRef.current;
    if (!path) return;
    setTabs((current) =>
      current.map((tab) => (tab.path === path ? { ...tab, value } : tab)),
    );
  }, []);

  const setValueAt = useCallback((path: string, value: string) => {
    setTabs((current) =>
      current.map((tab) => (tab.path === path ? { ...tab, value } : tab)),
    );
  }, []);

  const setCursor = useCallback((line: number, column: number) => {
    const path = activePathRef.current;
    if (!path) return;
    setTabs((current) =>
      current.map((tab) =>
        tab.path === path
          ? { ...tab, cursorLine: line, cursorColumn: column }
          : tab,
      ),
    );
  }, []);

  const save = useCallback(async () => {
    const path = activePathRef.current;
    const tab = tabsRef.current.find((t) => t.path === path);
    if (!tab) return;

    setBusy(true);
    setTreeError(null);
    try {
      await writeTextFile(tab.path, tab.value);
      setTabs((current) =>
        current.map((t) =>
          t.path === tab.path ? { ...t, baseline: t.value } : t,
        ),
      );
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const state = useMemo<WorkspaceState>(
    () => ({
      rootPath,
      rootName: rootPath ? basename(rootPath) : null,
      tree,
      expanded,
      treeError,
      busy,
      tabs,
      activePath,
      document,
      dirty: document ? isDirty(document) : false,
      cursorLine: document?.cursorLine ?? 1,
      cursorColumn: document?.cursorColumn ?? 1,
      revealTarget,
      openFolder,
      toggleDirectory,
      openFile,
      openFileAt,
      activateTab,
      closeTab,
      moveTab,
      setValue,
      setValueAt,
      setCursor,
      clearRevealTarget,
      save,
    }),
    [
      rootPath,
      tree,
      expanded,
      treeError,
      busy,
      tabs,
      activePath,
      document,
      revealTarget,
      openFolder,
      toggleDirectory,
      openFile,
      openFileAt,
      activateTab,
      closeTab,
      moveTab,
      setValue,
      setValueAt,
      setCursor,
      clearRevealTarget,
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
