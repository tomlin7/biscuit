import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { exists, readTextFile, stat, writeTextFile } from "@tauri-apps/plugin-fs";
import { listDirectory, type TreeNode } from "./fsTree";
import {
  basename,
  isImageFile,
  isProbablyTextFile,
  isSafeEntryName,
  joinPath,
  languageFromPath,
  parentPath,
  directoryChain,
} from "./path";
import { pushClosedEditor, rememberFile, rememberFolder, popClosedEditor } from "./history";
import { readSession, writeSession } from "./session";
import { applyEditorConfigText, editorConfigFor } from "../editor/editorconfig";
import { appendLog } from "../logs/logBus";

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
  openFolderAt: (path: string) => Promise<void>;
  reopenClosed: () => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openDroppedPaths: (paths: string[]) => Promise<void>;
  openFileAt: (path: string, line: number, column: number) => Promise<void>;
  activateTab: (path: string) => void;
  closeTab: (path: string) => void;
  moveTab: (fromPath: string, toPath: string) => void;
  setValue: (value: string) => void;
  setEol: (eol: "lf" | "crlf") => void;
  setValueAt: (path: string, value: string) => void;
  applyDiskValue: (path: string, value: string) => void;
  setCursor: (line: number, column: number) => void;
  clearRevealTarget: () => void;
  save: () => Promise<void>;
  saveAs: () => Promise<void>;
  saveAll: () => Promise<void>;
  closeAll: () => void;
  createEntry: (parent: string, kind: "file" | "directory") => Promise<void>;
  renameEntry: (path: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  revealInExplorer: (path: string) => Promise<void>;
  explorerNonce: number;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

function findTreeNode(nodes: TreeNode[], path: string): TreeNode | undefined {
  const key = path.replace(/\\/g, "/").toLowerCase();
  for (const node of nodes) {
    if (node.path.replace(/\\/g, "/").toLowerCase() === key) return node;
    if (node.children) {
      const found = findTreeNode(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

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

function mergeDirectory(prev: TreeNode[] | undefined, next: TreeNode[]): TreeNode[] {
  const previous = new Map((prev ?? []).map((node) => [node.path, node]));
  return next.map((node) => {
    const old = previous.get(node.path);
    if (node.kind === "directory" && old?.kind === "directory" && old.loaded) {
      return { ...node, children: old.children, loaded: true };
    }
    return node;
  });
}

function withPrefix(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  return path.endsWith(sep) ? path : `${path}${sep}`;
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
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const [explorerNonce, setExplorerNonce] = useState(0);
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  const document = useMemo(
    () => tabs.find((tab) => tab.path === activePath) ?? null,
    [tabs, activePath],
  );

  const openFolderAt = useCallback(async (path: string) => {
    setBusy(true);
    setTreeError(null);
    try {
      const children = await listDirectory(path);
      setRootPath(path);
      setTree(children);
      setExpanded(new Set());
      setTabs([]);
      setActivePath(null);
      rememberFolder(path);
      appendLog(`Opened folder ${path}`);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const sessionReady = useRef(false);

  const openFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Folder",
    });
    if (selected === null) return;

    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    await openFolderAt(path);
  }, [openFolderAt]);

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

  const revealInExplorer = useCallback(
    async (path: string) => {
      if (!rootPath) return;
      const dirs = directoryChain(rootPath, path);
      if (dirs.length === 0) return;
      setExplorerNonce((value) => value + 1);
      setBusy(true);
      setTreeError(null);
      try {
        let current = treeRef.current;
        for (const dir of dirs) {
          const node = findTreeNode(current, dir);
          if (!node || node.kind !== "directory") break;
          if (!node.loaded) {
            const children = await listDirectory(dir);
            current = updateTreeNode(current, node.path, (item) => ({
              ...item,
              children,
              loaded: true,
            }));
          }
        }
        setTree(current);
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const dir of dirs) next.add(dir);
          const known = dirs
            .map((dir) => findTreeNode(current, dir)?.path)
            .filter((item): item is string => Boolean(item));
          for (const dir of known) next.add(dir);
          return next;
        });
      } catch (err) {
        setTreeError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [rootPath],
  );

  const openFile = useCallback(async (path: string) => {
    if (isImageFile(path)) {
      if (tabsRef.current.some((tab) => tab.path === path)) {
        setActivePath(path);
        rememberFile(path);
        return;
      }
      const next: EditorTab = {
        path,
        title: basename(path),
        language: "image",
        value: "",
        baseline: "",
        cursorLine: 1,
        cursorColumn: 1,
      };
      setTabs((current) => (current.some((tab) => tab.path === path) ? current : [...current, next]));
      setActivePath(path);
      rememberFile(path);
      return;
    }

    if (!isProbablyTextFile(path)) {
      setTreeError(`Cannot open binary file: ${basename(path)}`);
      return;
    }

    if (tabsRef.current.some((tab) => tab.path === path)) {
      setActivePath(path);
      rememberFile(path);
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
      rememberFile(path);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const openDroppedPaths = useCallback(
    async (paths: string[]) => {
      const files: string[] = [];
      const folders: string[] = [];
      for (const path of paths) {
        try {
          const info = await stat(path);
          if (info.isDirectory) folders.push(path);
          else if (info.isFile) files.push(path);
        } catch (err) {
          setTreeError(err instanceof Error ? err.message : String(err));
        }
      }

      if (folders.length > 0 && files.length === 0) {
        await openFolderAt(folders[0]);
        return;
      }

      const opened: string[] = [];
      for (const path of files) {
        await openFile(path);
        if (isProbablyTextFile(path)) opened.push(path);
      }
      if (opened[0]) setActivePath(opened[0]);
    },
    [openFolderAt, openFile],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = readSession();
      try {
        if (session && (await exists(session.root))) {
          await openFolderAt(session.root);
          if (cancelled) return;
          for (const path of session.tabs) {
            if (await exists(path)) await openFile(path);
          }
          if (!cancelled && session.active && (await exists(session.active))) {
            setActivePath(session.active);
          }
        }
      } catch {
        /* keep the empty window if the last folder is gone */
      } finally {
        if (!cancelled) sessionReady.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openFolderAt, openFile]);

  useEffect(() => {
    if (!sessionReady.current) return;
    if (!rootPath) {
      writeSession(null);
      return;
    }
    writeSession({
      root: rootPath,
      tabs: tabs.map((tab) => tab.path),
      active: activePath,
      preview: readSession()?.preview ?? false,
      split: readSession()?.split ?? false,
      secondary: readSession()?.secondary ?? null,
    });
  }, [rootPath, tabs, activePath]);

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

  const reopenClosed = useCallback(async () => {
    const path = popClosedEditor();
    if (!path) return;
    await openFile(path);
  }, [openFile]);

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

    pushClosedEditor(path);
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

  const setEol = useCallback((eol: "lf" | "crlf") => {
    const path = activePathRef.current;
    if (!path) return;
    setTabs((current) =>
      current.map((tab) => {
        if (tab.path !== path) return tab;
        const value =
          eol === "lf" ? tab.value.replace(/\r\n/g, "\n") : tab.value.replace(/\r?\n/g, "\r\n");
        return value === tab.value ? tab : { ...tab, value };
      }),
    );
  }, []);

  const setValueAt = useCallback((path: string, value: string) => {
    setTabs((current) =>
      current.map((tab) => (tab.path === path ? { ...tab, value } : tab)),
    );
  }, []);

  const applyDiskValue = useCallback((path: string, value: string) => {
    setTabs((current) =>
      current.map((tab) =>
        tab.path === path ? { ...tab, value, baseline: value } : tab,
      ),
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

  const reloadDirectory = useCallback(
    async (dir: string) => {
      const children = await listDirectory(dir);
      if (rootPath && dir === rootPath) {
        setTree((current) => mergeDirectory(current, children));
        return;
      }
      setTree((current) =>
        updateTreeNode(current, dir, (node) => ({
          ...node,
          children: mergeDirectory(node.children, children),
          loaded: true,
        })),
      );
    },
    [rootPath],
  );

  const createEntry = useCallback(
    async (parent: string, kind: "file" | "directory") => {
      if (!rootPath) return;
      const name = window.prompt(kind === "file" ? "File name" : "Folder name");
      if (name === null) return;
      if (!isSafeEntryName(name)) {
        setTreeError("Name cannot be empty or contain a path separator.");
        return;
      }
      const path = joinPath(parent, name.trim());
      setBusy(true);
      setTreeError(null);
      try {
        await invoke(kind === "file" ? "fs_create_file" : "fs_mkdir", {
          root: rootPath,
          path,
        });
        setExpanded((prev) => new Set(prev).add(parent));
        await reloadDirectory(parent);
        if (kind === "file") await openFile(path);
      } catch (err) {
        setTreeError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [rootPath, reloadDirectory, openFile],
  );

  const renameEntry = useCallback(
    async (path: string) => {
      if (!rootPath) return;
      const currentName = basename(path);
      const name = window.prompt("Rename", currentName);
      if (name === null) return;
      if (!isSafeEntryName(name)) {
        setTreeError("Name cannot be empty or contain a path separator.");
        return;
      }
      if (name.trim() === currentName) return;
      const parent = parentPath(path);
      if (!parent) return;
      const nextPath = joinPath(parent, name.trim());
      setBusy(true);
      setTreeError(null);
      try {
        await invoke("fs_rename", { root: rootPath, from: path, to: nextPath });
        const prefix = withPrefix(path);
        const remap = (oldPath: string) => {
          if (oldPath === path) return nextPath;
          if (oldPath.startsWith(prefix)) {
            return `${nextPath}${oldPath.slice(path.length)}`;
          }
          return oldPath;
        };
        setTabs((current) =>
          current.map((tab) => {
            const mapped = remap(tab.path);
            if (mapped === tab.path) return tab;
            return { ...tab, path: mapped, title: basename(mapped) };
          }),
        );
        setActivePath((active) => (active ? remap(active) : active));
        await reloadDirectory(parent);
      } catch (err) {
        setTreeError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [rootPath, reloadDirectory],
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      if (!rootPath) return;
      const ok = window.confirm(`Delete ${basename(path)}? This cannot be undone.`);
      if (!ok) return;
      const parent = parentPath(path);
      if (!parent) return;
      setBusy(true);
      setTreeError(null);
      try {
        await invoke("fs_remove", { root: rootPath, path });
        const prefix = withPrefix(path);
        setTabs((current) => {
          const next = current.filter(
            (tab) => tab.path !== path && !tab.path.startsWith(prefix),
          );
          setActivePath((active) => {
            if (!active || active === path || active.startsWith(prefix)) {
              return next[0]?.path ?? null;
            }
            return active;
          });
          return next;
        });
        await reloadDirectory(parent);
      } catch (err) {
        setTreeError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [rootPath, reloadDirectory],
  );

  const saveAll = useCallback(async () => {
    const dirty = tabsRef.current.filter(isDirty);
    if (dirty.length === 0) return;
    setBusy(true);
    setTreeError(null);
    try {
      const saved = new Map<string, string>();
      for (const tab of dirty) {
        const config = await editorConfigFor(tab.path, rootPath);
        const text = applyEditorConfigText(tab.value, config);
        await writeTextFile(tab.path, text);
        saved.set(tab.path, text);
      }
      setTabs((current) =>
        current.map((tab) => {
          const value = saved.get(tab.path);
          return value === undefined ? tab : { ...tab, value, baseline: value };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTreeError(message);
      appendLog(`Save failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [rootPath]);

  const closeAll = useCallback(() => {
    const open = tabsRef.current;
    if (open.length === 0) return;
    const dirty = open.filter(isDirty);
    if (dirty.length > 0) {
      const ok = window.confirm(
        dirty.length === 1
          ? `Close ${dirty[0].title} without saving?`
          : `Close ${dirty.length} unsaved files without saving?`,
      );
      if (!ok) return;
    }
    for (const tab of open) pushClosedEditor(tab.path);
    setTabs([]);
    setActivePath(null);
  }, []);

  const save = useCallback(async () => {
    const path = activePathRef.current;
    const tab = tabsRef.current.find((t) => t.path === path);
    if (!tab || tab.language === "image") return;

    setBusy(true);
    setTreeError(null);
    try {
      const config = await editorConfigFor(tab.path, rootPath);
      const text = applyEditorConfigText(tab.value, config);
      await writeTextFile(tab.path, text);
      setTabs((current) =>
        current.map((t) =>
          t.path === tab.path ? { ...t, value: text, baseline: text } : t,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTreeError(message);
      appendLog(`Save failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [rootPath]);

  const saveAs = useCallback(async () => {
    const path = activePathRef.current;
    const tab = tabsRef.current.find((item) => item.path === path);
    if (!tab || tab.language === "image") return;
    const dest = await saveDialog({ defaultPath: tab.path, title: "Save As" });
    if (!dest) return;
    setBusy(true);
    setTreeError(null);
    try {
      const config = await editorConfigFor(dest, rootPath);
      const text = applyEditorConfigText(tab.value, config);
      await writeTextFile(dest, text);
      setTabs((current) => {
        const next = {
          path: dest,
          title: basename(dest),
          language: languageFromPath(dest),
          value: text,
          baseline: text,
        };
        const others = current.filter((item) => item.path !== tab.path);
        if (others.some((item) => item.path === dest)) {
          return others.map((item) => (item.path === dest ? { ...item, ...next } : item));
        }
        return current.map((item) => (item.path === tab.path ? { ...item, ...next } : item));
      });
      setActivePath(dest);
      rememberFile(dest);
      const parent = parentPath(dest);
      if (
        parent &&
        rootPath &&
        dest.replace(/\\/g, "/").toLowerCase().startsWith(rootPath.replace(/\\/g, "/").toLowerCase())
      ) {
        await reloadDirectory(parent);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTreeError(message);
      appendLog(`Save failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [rootPath, reloadDirectory]);

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
      openFolderAt,
      reopenClosed,
      toggleDirectory,
      openFile,
      openDroppedPaths,
      openFileAt,
      activateTab,
      closeTab,
      moveTab,
      setValue,
      setEol,
      setValueAt,
      applyDiskValue,
      setCursor,
      clearRevealTarget,
      save,
      saveAs,
      saveAll,
      closeAll,
      createEntry,
      renameEntry,
      deleteEntry,
      revealInExplorer,
      explorerNonce,
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
      openFolderAt,
      reopenClosed,
      toggleDirectory,
      openFile,
      openDroppedPaths,
      openFileAt,
      activateTab,
      closeTab,
      moveTab,
      setValue,
      setEol,
      setValueAt,
      applyDiskValue,
      setCursor,
      clearRevealTarget,
      save,
      saveAs,
      saveAll,
      closeAll,
      createEntry,
      renameEntry,
      deleteEntry,
      revealInExplorer,
      explorerNonce,
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
