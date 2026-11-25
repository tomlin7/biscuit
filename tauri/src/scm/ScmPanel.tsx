import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCompare,
  GitPullRequest,
  Minus,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Undo2,
  Copy,
  GitCommit,
  GitFork,
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { joinPath } from "../workspace/path";
import { appendLog } from "../logs/logBus";
import { openDiffTab } from "./diffBus";
import { openCompareTab } from "./compareBus";
import { githubPullRequestUrl, githubWebUrlFromRemote } from "./githubRemote";
import { readIgnoreSpacePref } from "./diffPrefs";
import { setToggleAmendListener } from "./amendBus";
import { setScmRemoteListener, type ScmRemoteAction } from "./scmRemoteBus";
import {
  fetchGitSubmodules,
  initGitSubmodule,
  updateGitSubmodule,
  syncGitSubmodules,
  formatSubmoduleStatus,
  formatSubmoduleRef,
  type GitSubmoduleInfo,
} from "./submodules";
import {
  fetchGitTags,
  createGitTag,
  deleteGitTag,
  pushGitTags,
  formatTagCommit,
  formatTagDate,
  validateTagName,
  filterTags,
  copyTagNameToClipboard,
  type GitTagInfo,
} from "./tags";
import {
  fetchGitLog,
  fetchRebaseStatus,
  fetchRebaseTodo,
  startRebase,
  continueRebase,
  abortRebase,
  skipRebase,
  cherryPick,
  continueCherryPick,
  abortCherryPick,
  moveTodoItem,
  updateTodoAction,
  updateTodoMessage,
  validateRebaseTodo,
  formatRebaseStatusBanner,
  type GitRebaseStatus,
  type RebaseTodoItem,
  type RebaseAction,
  type GitCommitInfo,
} from "./rebase";
import { IconButton } from "../ui/IconButton";
import { FileIcon } from "../ui/FileIcon";
import { EmptyState } from "../ui/EmptyState";
import "./ScmPanel.css";

export type GitStatusEntry = {
  path: string;
  index: string;
  worktree: string;
  status: string;
};

export type GitSummary = {
  branch: string;
  entries: GitStatusEntry[];
  ahead?: number | null;
  behind?: number | null;
};

export type GitBranchInfo = {
  branch: string;
  ahead: number | null;
  behind: number | null;
  dirtyCount: number;
};

type Props = {
  onBranch: (info: GitBranchInfo | null) => void;
};

type ScmContextMenuState = {
  x: number;
  y: number;
  entry: GitStatusEntry;
  isStaged: boolean;
};

export function ScmPanel({ onBranch }: Props) {
  const { rootPath, openFile, openFolderAt, busy, tabs, applyDiskValue, closeTab } = useWorkspace();
  const [summary, setSummary] = useState<GitSummary | null>(null);
  const [submodules, setSubmodules] = useState<GitSubmoduleInfo[]>([]);
  const [submodulesCollapsed, setSubmodulesCollapsed] = useState(false);
  const [tags, setTags] = useState<GitTagInfo[]>([]);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagTarget, setNewTagTarget] = useState("");
  const [newTagMessage, setNewTagMessage] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [acting, setActing] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [amend, setAmend] = useState(false);
  const [canAmend, setCanAmend] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const [changesCollapsed, setChangesCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<ScmContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [rebaseStatus, setRebaseStatus] = useState<GitRebaseStatus | null>(null);
  const [showRebaseDialog, setShowRebaseDialog] = useState(false);
  const [rebaseUpstream, setRebaseUpstream] = useState("main");
  const [rebaseItems, setRebaseItems] = useState<RebaseTodoItem[]>([]);
  const [rebaseLoading, setRebaseLoading] = useState(false);
  const [rebaseError, setRebaseError] = useState<string | null>(null);

  const [showCherryPickDialog, setShowCherryPickDialog] = useState(false);
  const [cherryPickBranch, setCherryPickBranch] = useState("");
  const [cherryPickCommitSha, setCherryPickCommitSha] = useState("");
  const [cherryPickNoCommit, setCherryPickNoCommit] = useState(false);
  const [cherryPickCommits, setCherryPickCommits] = useState<GitCommitInfo[]>([]);
  const [cherryPickLoading, setCherryPickLoading] = useState(false);
  const [cherryPickError, setCherryPickError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!rootPath) {
      setSummary(null);
      setBranches([]);
      setSubmodules([]);
      setTags([]);
      setRebaseStatus(null);
      onBranch(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await invoke<GitSummary>("git_summary", { cwd: rootPath });
      setSummary(next);
      setSelected((current) => {
        const paths = new Set(next.entries.map((entry) => entry.path));
        return new Set([...current].filter((path) => paths.has(path)));
      });
      onBranch({
        branch: next.branch,
        ahead: next.ahead ?? null,
        behind: next.behind ?? null,
        dirtyCount: next.entries.length,
      });
      const names = await invoke<string[]>("git_branches", { cwd: rootPath });
      setBranches(names);
      try {
        setCanAmend(await invoke<boolean>("git_can_amend", { cwd: rootPath }));
      } catch {
        setCanAmend(false);
      }
      try {
        const subs = await fetchGitSubmodules(rootPath);
        setSubmodules(subs);
      } catch {
        setSubmodules([]);
      }
      try {
        const tagList = await fetchGitTags(rootPath);
        setTags(tagList);
      } catch {
        setTags([]);
      }
      try {
        const reb = await fetchRebaseStatus(rootPath);
        setRebaseStatus(reb);
      } catch {
        setRebaseStatus(null);
      }
    } catch (err) {
      setSummary(null);
      setBranches([]);
      setSubmodules([]);
      setTags([]);
      setRebaseStatus(null);
      setCanAmend(false);
      onBranch(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [rootPath, onBranch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setToggleAmendListener(() => {
      setAmend((current) => {
        if (!current && !canAmend) {
          const ok = window.confirm(
            "HEAD may already be on the remote. Amend anyway?",
          );
          if (!ok) return current;
        }
        return !current;
      });
    });
    return () => setToggleAmendListener(null);
  }, [canAmend]);

  // Context menu dismissal
  useEffect(() => {
    if (!contextMenu) return;
    const handleDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [contextMenu]);

  const run = async (command: string, args: Record<string, unknown> = {}) => {
    if (!rootPath) return false;
    setActing(true);
    setError(null);
    try {
      const out = await invoke<string | null>(command, {
        cwd: rootPath,
        ...args,
      });
      if (out?.trim()) appendLog(out.trim());
      await refresh();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Git failed: ${msg}`);
      return false;
    } finally {
      setActing(false);
    }
  };

  const push = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const out = await invoke<string>("git_push", { cwd: rootPath });
      if (out?.trim()) appendLog(out.trim());
      else appendLog("Push completed.");
      await refresh();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (/no upstream|set the remote as upstream|has no upstream branch/i.test(detail)) {
        const confirmPush = window.confirm(
          "This branch has no upstream. Push and set origin as upstream?",
        );
        if (confirmPush) {
          try {
            const out = await invoke<string>("git_push", {
              cwd: rootPath,
              setUpstream: true,
            });
            if (out?.trim()) appendLog(out.trim());
            else appendLog("Pushed and set upstream to origin.");
            await refresh();
            return;
          } catch (upstreamErr) {
            const upstreamDetail =
              upstreamErr instanceof Error ? upstreamErr.message : String(upstreamErr);
            setError(upstreamDetail);
            appendLog(`Git failed: ${upstreamDetail}`);
            return;
          }
        }
      }
      setError(detail);
      appendLog(`Git failed: ${detail}`);
    } finally {
      setActing(false);
    }
  };

  const staged = summary?.entries.filter((entry) => entry.index !== " " && entry.index !== "?") ?? [];
  const unstaged =
    summary?.entries.filter((entry) => entry.worktree !== " " || entry.index === "?") ?? [];
  const selectedPaths = summary?.entries.filter((entry) => selected.has(entry.path)).map((e) => e.path) ?? [];
  const selectedUnstaged = selectedPaths.filter((path) =>
    unstaged.some((entry) => entry.path === path),
  );
  const selectedStaged = selectedPaths.filter((path) =>
    staged.some((entry) => entry.path === path),
  );

  useEffect(() => {
    setScmRemoteListener((action: ScmRemoteAction) => {
      if (action === "pull") void run("git_pull", {});
      else if (action === "fetch") void run("git_fetch", {});
      else if (action === "stash") {
        const msg = window.prompt("Stash message (optional)") ?? undefined;
        void run("git_stash_push", { message: msg?.trim() || null });
      } else if (action === "stashPop") void run("git_stash_pop", {});
      else if (action === "createBranch") {
        const name = window.prompt("New branch name")?.trim();
        if (!name) return;
        void run("git_create_branch", { branch: name });
      } else if (action === "checkout") {
        const name = window.prompt("Branch to check out")?.trim();
        if (!name) return;
        void run("git_checkout", { branch: name });
      } else if (action === "stageAll") {
        if (unstaged.length === 0) return;
        void run("git_stage", { paths: unstaged.map((entry) => entry.path) });
      } else if (action === "unstageAll") {
        if (staged.length === 0) return;
        void run("git_unstage", { paths: staged.map((entry) => entry.path) });
      } else if (action === "discardAll") {
        if (unstaged.length === 0) return;
        const ok = window.confirm(
          `Discard all unstaged changes in ${unstaged.length} path(s)?`,
        );
        if (!ok) return;
        void (async () => {
          for (const entry of unstaged) {
            const untracked = entry.index === "?";
            const succeeded = await run("git_discard", {
              path: entry.path,
              untracked,
            });
            if (!succeeded || !rootPath) continue;
            const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
            const absolute = joinPath(rootPath, relative);
            const open = tabs.find(
              (tab) => tab.path.replace(/\\/g, "/").toLowerCase() === absolute.replace(/\\/g, "/").toLowerCase(),
            );
            if (!open) continue;
            if (untracked) {
              closeTab(open.path);
              continue;
            }
            try {
              const text = await readTextFile(absolute);
              applyDiskValue(open.path, text);
            } catch {
              closeTab(open.path);
            }
          }
        })();
      } else if (action === "pasteCommitMessage") {
        void navigator.clipboard.readText().then((text) => {
          const next = text.trim();
          if (next) setMessage(next);
        });
      } else if (action === "clearCommitMessage") {
        setMessage("");
      } else if (action === "submoduleUpdateAll") {
        void handleSubmoduleUpdateAll();
      } else if (action === "submoduleInitAll") {
        void handleSubmoduleInitAll();
      } else if (action === "submoduleSyncAll") {
        void handleSubmoduleSyncAll();
      } else if (action === "tagCreate") {
        setTagsCollapsed(false);
        setShowCreateTagDialog(true);
        setTagError(null);
      } else if (action === "tagDelete") {
        void handlePromptDeleteTag();
      } else if (action === "tagPush") {
        void handlePushTags();
      } else if (action === "rebaseInteractive") {
        openInteractiveRebase();
      } else if (action === "rebaseContinue") {
        void handleRebaseContinue();
      } else if (action === "rebaseAbort") {
        void handleRebaseAbort();
      } else if (action === "cherryPick") {
        openCherryPickModal();
      } else if (action === "cherryPickContinue") {
        void handleCherryPickContinue();
      } else if (action === "cherryPickAbort") {
        void handleCherryPickAbort();
      } else if (action === "push") {
        void push();
      }
    });
    return () => setScmRemoteListener(null);
  });

  const toggleSelected = (path: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openDiff = (entry: GitStatusEntry, isStaged: boolean) => {
    if (!rootPath) return;
    const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
    const absolute = joinPath(rootPath, relative);
    void (async () => {
      try {
        const ignoreSpace = readIgnoreSpacePref();
        const text = await invoke<string>("git_diff", {
          cwd: rootPath,
          path: entry.path,
          staged: isStaged,
          ignoreSpace,
        });
        let head: string | null = null;
        try {
          head = await invoke<string>("git_show_head", {
            cwd: rootPath,
            path: entry.path,
          });
        } catch {
          head = null;
        }
        let working: string | null = null;
        try {
          working = await readTextFile(absolute);
        } catch {
          working = null;
        }
        openDiffTab(entry.path, text, {
          head,
          working,
          cwd: rootPath,
          staged: isStaged,
          ignoreSpace,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  const discardEntry = (entry: GitStatusEntry) => {
    const untracked = entry.index === "?";
    const ok = window.confirm(
      untracked
        ? `Delete untracked ${entry.path}?`
        : `Discard changes in ${entry.path}?`,
    );
    if (!ok) return;
    void (async () => {
      const succeeded = await run("git_discard", {
        path: entry.path,
        untracked,
      });
      if (!succeeded || !rootPath) return;
      const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
      const absolute = joinPath(rootPath, relative);
      const open = tabs.find(
        (tab) => tab.path.replace(/\\/g, "/").toLowerCase() === absolute.replace(/\\/g, "/").toLowerCase(),
      );
      if (!open) return;
      if (untracked) {
        closeTab(open.path);
        return;
      }
      try {
        const text = await readTextFile(absolute);
        applyDiskValue(open.path, text);
      } catch {
        closeTab(open.path);
      }
    })();
  };

  const handleCommit = () => {
    const text = message.trim();
    if (!amend && (!text || staged.length === 0)) return;
    if (amend && !canAmend) {
      const ok = window.confirm(
        "Amending may rewrite a commit that is already published. Continue?",
      );
      if (!ok) return;
    }
    void run("git_commit", { message: text, amend }).then((ok) => {
      if (ok) {
        setMessage("");
        setAmend(false);
      }
    });
  };

  const onCommitKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
  };

  if (!rootPath) {
    return (
      <div className="scm-panel scm-panel--empty">
        <EmptyState
          compact
          icon={GitBranch}
          title="No repository"
          description="Open a folder under Git to stage, commit, and sync changes."
        />
      </div>
    );
  }

  const handleInitSubmodule = async (sub: GitSubmoduleInfo) => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const outInit = await initGitSubmodule(rootPath, sub.path);
      if (outInit?.trim()) appendLog(outInit.trim());
      const outUpdate = await updateGitSubmodule(rootPath, sub.path, true);
      if (outUpdate?.trim()) appendLog(outUpdate.trim());
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Submodule init failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleUpdateSubmodule = async (sub: GitSubmoduleInfo, recursive: boolean = true) => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const out = await updateGitSubmodule(rootPath, sub.path, recursive);
      if (out?.trim()) appendLog(out.trim());
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Submodule update failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleOpenSubmoduleFolder = (sub: GitSubmoduleInfo) => {
    if (!rootPath) return;
    const rel = sub.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
    const abs = joinPath(rootPath, rel);
    void openFolderAt(abs);
  };

  const handleSubmoduleUpdateAll = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const out = await updateGitSubmodule(rootPath, null, true);
      if (out?.trim()) appendLog(out.trim());
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Submodule update all failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleSubmoduleSyncAll = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const out = await syncGitSubmodules(rootPath, true);
      if (out?.trim()) appendLog(out.trim());
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Submodule sync all failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleSubmoduleInitAll = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const outInit = await initGitSubmodule(rootPath, null);
      if (outInit?.trim()) appendLog(outInit.trim());
      const outUpdate = await updateGitSubmodule(rootPath, null, true);
      if (outUpdate?.trim()) appendLog(outUpdate.trim());
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Submodule init all failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const renderSubmoduleRow = (sub: GitSubmoduleInfo) => {
    const statusInfo = formatSubmoduleStatus(sub.status);
    const commitOrBranch = formatSubmoduleRef(sub.head_commit, sub.branch);
    const isUninit = sub.status.toLowerCase() === "uninitialized";

    return (
      <li key={sub.path} className="scm-panel__row scm-panel__submodule-row">
        <div className="scm-panel__submodule-main">
          <FolderGit2 size={14} className="scm-panel__submodule-icon" />
          <div className="scm-panel__submodule-meta">
            <div className="scm-panel__submodule-title-row">
              <span className="scm-panel__submodule-name" title={sub.name || sub.path}>
                {sub.name || sub.path}
              </span>
              <span
                className={`scm-panel__submodule-badge ${statusInfo.badgeClass}`}
                title={`Status: ${sub.status}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <div className="scm-panel__submodule-details">
              <span className="scm-panel__submodule-path" title={sub.path}>
                {sub.path}
              </span>
              <span
                className="scm-panel__submodule-commit"
                title={`Commit: ${sub.head_commit ?? "none"}${sub.branch ? ` (${sub.branch})` : ""}`}
              >
                {commitOrBranch}
              </span>
            </div>
          </div>
        </div>
        <div className="scm-panel__row-actions scm-panel__submodule-actions">
          {isUninit ? (
            <IconButton
              icon={Download}
              label="Initialize submodule"
              size={13}
              disabled={acting}
              onClick={() => void handleInitSubmodule(sub)}
            />
          ) : null}
          <IconButton
            icon={RefreshCw}
            label="Update submodule"
            size={13}
            disabled={acting}
            onClick={() => void handleUpdateSubmodule(sub)}
          />
          <IconButton
            icon={FolderOpen}
            label="Open submodule folder"
            size={13}
            disabled={acting}
            onClick={() => handleOpenSubmoduleFolder(sub)}
          />
        </div>
      </li>
    );
  };

  const handleCheckoutTag = async (tag: GitTagInfo) => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      await invoke("git_checkout", { cwd: rootPath, branch: `tags/${tag.name}` });
      appendLog(`Checked out tag ${tag.name}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Checkout tag failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleDeleteTag = async (tag: GitTagInfo) => {
    if (!rootPath) return;
    const ok = window.confirm(`Delete tag "${tag.name}"?`);
    if (!ok) return;
    setActing(true);
    setError(null);
    try {
      await deleteGitTag(rootPath, tag.name);
      appendLog(`Deleted tag ${tag.name}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Delete tag failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleCopyTagName = async (tag: GitTagInfo) => {
    const ok = await copyTagNameToClipboard(tag.name);
    if (ok) {
      appendLog(`Copied tag "${tag.name}" to clipboard`);
    } else {
      appendLog(`Failed to copy tag "${tag.name}" to clipboard`);
    }
  };

  const handlePushTags = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      await pushGitTags(rootPath);
      appendLog("Pushed tags to remote");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Push tags failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handlePromptDeleteTag = async () => {
    if (!rootPath) return;
    const name = window.prompt("Enter tag name to delete:");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const ok = window.confirm(`Delete tag "${trimmed}"?`);
    if (!ok) return;
    setActing(true);
    setError(null);
    try {
      await deleteGitTag(rootPath, trimmed);
      appendLog(`Deleted tag ${trimmed}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Delete tag failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const resetCreateTagForm = () => {
    setShowCreateTagDialog(false);
    setNewTagName("");
    setNewTagTarget("");
    setNewTagMessage("");
    setTagError(null);
  };

  const handleCreateTagSubmit = async () => {
    if (!rootPath) return;
    const name = newTagName.trim();
    const validation = validateTagName(name);
    if (!validation.valid) {
      setTagError(validation.error ?? "Invalid tag name");
      return;
    }
    setActing(true);
    setTagError(null);
    try {
      await createGitTag(
        rootPath,
        name,
        newTagTarget.trim() || null,
        newTagMessage.trim() || null,
      );
      appendLog(`Created tag ${name}`);
      resetCreateTagForm();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTagError(msg);
      appendLog(`Create tag failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const openInteractiveRebase = () => {
    const defaultBase = branches.find((b) => b !== summary?.branch) ?? "main";
    setRebaseUpstream(defaultBase);
    setRebaseError(null);
    setShowRebaseDialog(true);
    if (rootPath) {
      void loadRebaseTodos(defaultBase);
    }
  };

  const loadRebaseTodos = async (upstream: string) => {
    if (!rootPath || !upstream.trim()) return;
    setRebaseLoading(true);
    setRebaseError(null);
    try {
      const todos = await fetchRebaseTodo(rootPath, upstream);
      setRebaseItems(todos);
      if (todos.length === 0) {
        setRebaseError(`Branch is up to date with "${upstream.trim()}" (no commits to rebase).`);
      }
    } catch (err) {
      setRebaseItems([]);
      setRebaseError(err instanceof Error ? err.message : String(err));
    } finally {
      setRebaseLoading(false);
    }
  };

  const handleStartRebase = async () => {
    if (!rootPath) return;
    const validation = validateRebaseTodo(rebaseItems);
    if (!validation.valid) {
      setRebaseError(validation.error ?? "Invalid rebase plan");
      return;
    }
    setActing(true);
    setRebaseError(null);
    try {
      const res = await startRebase(rootPath, rebaseUpstream, rebaseItems);
      appendLog(`Rebase: ${res.message}`);
      setShowRebaseDialog(false);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRebaseError(msg);
      appendLog(`Rebase start failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleRebaseContinue = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const res = await continueRebase(rootPath);
      appendLog(`Rebase: ${res.message}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Rebase continue failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleRebaseSkip = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const res = await skipRebase(rootPath);
      appendLog(`Rebase: ${res.message}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Rebase skip failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleRebaseAbort = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      await abortRebase(rootPath);
      appendLog("Rebase aborted.");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Rebase abort failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const openCherryPickModal = () => {
    const otherBranch = branches.find((b) => b !== summary?.branch) ?? "";
    setCherryPickBranch(otherBranch);
    setCherryPickCommitSha("");
    setCherryPickNoCommit(false);
    setCherryPickError(null);
    setShowCherryPickDialog(true);
    if (otherBranch && rootPath) {
      void loadCherryPickCommits(otherBranch);
    }
  };

  const loadCherryPickCommits = async (branch: string) => {
    if (!rootPath || !branch.trim()) {
      setCherryPickCommits([]);
      return;
    }
    setCherryPickLoading(true);
    setCherryPickError(null);
    try {
      const list = await fetchGitLog(rootPath, 30, branch);
      setCherryPickCommits(list);
    } catch (err) {
      setCherryPickCommits([]);
      setCherryPickError(err instanceof Error ? err.message : String(err));
    } finally {
      setCherryPickLoading(false);
    }
  };

  const handleCherryPickSubmit = async () => {
    if (!rootPath || !cherryPickCommitSha.trim()) return;
    setActing(true);
    setCherryPickError(null);
    try {
      const res = await cherryPick(rootPath, cherryPickCommitSha.trim(), cherryPickNoCommit);
      appendLog(`Cherry-pick: ${res.message}`);
      setShowCherryPickDialog(false);
      setCherryPickCommitSha("");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCherryPickError(msg);
      appendLog(`Cherry-pick failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleCherryPickContinue = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      const res = await continueCherryPick(rootPath);
      appendLog(`Cherry-pick: ${res.message}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Cherry-pick continue failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const handleCherryPickAbort = async () => {
    if (!rootPath) return;
    setActing(true);
    setError(null);
    try {
      await abortCherryPick(rootPath);
      appendLog("Cherry-pick aborted.");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Cherry-pick abort failed: ${msg}`);
    } finally {
      setActing(false);
    }
  };

  const renderTagRow = (tag: GitTagInfo) => {
    const shortCommit = formatTagCommit(tag.commit);
    const dateFormatted = formatTagDate(tag.date);

    return (
      <li key={tag.name} className="scm-panel__row scm-panel__tag-row">
        <div className="scm-panel__tag-main">
          <Tag size={14} className="scm-panel__tag-icon" />
          <div className="scm-panel__tag-meta">
            <div className="scm-panel__tag-title-row">
              <span className="scm-panel__tag-name" title={tag.name}>
                {tag.name}
              </span>
              <span
                className="scm-panel__tag-commit"
                title={`Target commit: ${tag.commit}`}
              >
                {shortCommit}
              </span>
              {tag.annotated ? (
                <span className="scm-panel__tag-badge" title="Annotated tag">
                  annotated
                </span>
              ) : null}
            </div>
            <div className="scm-panel__tag-details">
              {tag.message ? (
                <span className="scm-panel__tag-message" title={tag.message}>
                  {tag.message}
                </span>
              ) : null}
              {dateFormatted !== "—" ? (
                <span className="scm-panel__tag-date">{dateFormatted}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="scm-panel__row-actions scm-panel__tag-actions">
          <IconButton
            icon={GitBranch}
            label={`Checkout tag ${tag.name}`}
            size={13}
            disabled={acting}
            onClick={() => void handleCheckoutTag(tag)}
          />
          <IconButton
            icon={Copy}
            label="Copy tag name"
            size={13}
            disabled={acting}
            onClick={() => void handleCopyTagName(tag)}
          />
          <IconButton
            icon={Trash2}
            label={`Delete tag ${tag.name}`}
            size={13}
            disabled={acting}
            onClick={() => void handleDeleteTag(tag)}
          />
        </div>
      </li>
    );
  };

  const renderFileRow = (entry: GitStatusEntry, isStaged: boolean) => {
    const isSelected = selected.has(entry.path);
    const fileName = entry.path.split(/[/\\]/).pop() ?? entry.path;
    const dirName = entry.path.includes("/") || entry.path.includes("\\")
      ? entry.path.substring(0, Math.max(entry.path.lastIndexOf("/"), entry.path.lastIndexOf("\\")))
      : "";

    return (
      <li key={`${isStaged ? "s" : "u"}:${entry.path}`} className="scm-panel__row">
        <label className="scm-panel__check" title="Select for bulk action">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelected(entry.path)}
            aria-label={`Select ${entry.path}`}
          />
        </label>
        <button
          type="button"
          className="scm-panel__file"
          onClick={() => openDiff(entry, isStaged)}
          onDoubleClick={() => {
            const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
            void openFile(joinPath(rootPath, relative));
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, entry, isStaged });
          }}
          title={`${entry.path}\nClick to view Diff · Double-click to open file`}
        >
          <FileIcon name={fileName} kind="file" size={13} />
          <span className="scm-panel__path-container">
            <span className="scm-panel__file-name">{fileName}</span>
            {dirName ? <span className="scm-panel__dir-name">{dirName}</span> : null}
          </span>
          <span className={`scm-panel__status scm-panel__status--${entry.status.trim().toLowerCase()}`}>
            {entry.status}
          </span>
        </button>
        <div className="scm-panel__row-actions">
          {isStaged ? (
            <IconButton
              icon={Minus}
              label="Unstage changes"
              size={12}
              disabled={acting}
              onClick={() => void run("git_unstage", { paths: [entry.path] })}
            />
          ) : (
            <>
              <IconButton
                icon={Plus}
                label="Stage changes"
                size={12}
                disabled={acting}
                onClick={() => void run("git_stage", { paths: [entry.path] })}
              />
              <IconButton
                icon={Undo2}
                label="Discard changes"
                size={12}
                disabled={acting}
                onClick={() => discardEntry(entry)}
              />
            </>
          )}
        </div>
      </li>
    );
  };

  const handleCreatePullRequest = async () => {
    if (!rootPath) return;
    try {
      const remote = await invoke<string>("git_remote_origin", { cwd: rootPath });
      const web = githubWebUrlFromRemote(remote);
      if (!web) {
        setError("Origin remote is not a GitHub URL.");
        return;
      }
      const branch = summary?.branch || "main";
      const url = githubPullRequestUrl(web, branch);
      appendLog(`Opening pull request for ${branch} on GitHub`);
      void openUrl(url);
    } catch {
      setError("Could not read git remote origin.");
    }
  };

  return (
    <div className="scm-panel">
      {/* Top Header with Branch Picker & Actions */}
      <div className="scm-panel__header">
        <div className="scm-panel__branch-select-wrap" title="Switch branch">
          <GitBranch size={13} strokeWidth={1.75} className="scm-panel__branch-icon" />
          <select
            className="scm-panel__branch-select"
            value={summary?.branch ?? ""}
            aria-label="Git branch"
            onChange={(e) => {
              const b = e.target.value;
              if (b && b !== summary?.branch) void run("git_checkout", { branch: b });
            }}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="scm-panel__header-actions">
          <IconButton
            icon={Plus}
            label="New branch"
            size={13}
            disabled={acting || busy}
            onClick={() => {
              const name = window.prompt("New branch name")?.trim();
              if (name) void run("git_create_branch", { branch: name });
            }}
          />
          <IconButton
            icon={ArrowDown}
            label="Pull"
            size={13}
            disabled={acting || busy}
            onClick={() => void run("git_pull", {})}
          />
          <IconButton
            icon={ArrowUp}
            label="Push"
            size={13}
            disabled={acting || busy}
            onClick={() => void push()}
          />
          <IconButton
            icon={Archive}
            label="Stash changes"
            size={13}
            disabled={acting || busy}
            onClick={() => {
              const msg = window.prompt("Stash message (optional)") ?? undefined;
              void run("git_stash_push", { message: msg?.trim() || null });
            }}
          />
          <IconButton
            icon={ArchiveRestore}
            label="Pop stash"
            size={13}
            disabled={acting || busy}
            onClick={() => void run("git_stash_pop", {})}
          />
          <IconButton
            icon={GitCompare}
            label="Compare branches / commits"
            size={13}
            disabled={acting || busy}
            onClick={() => openCompareTab("main", summary?.branch || "HEAD")}
          />
          <IconButton
            icon={GitPullRequest}
            label="Create pull request on GitHub"
            size={13}
            disabled={acting || busy}
            onClick={() => void handleCreatePullRequest()}
          />
          <IconButton
            icon={GitCommit}
            label="Interactive Rebase"
            size={13}
            disabled={acting || busy}
            onClick={openInteractiveRebase}
          />
          <IconButton
            icon={GitFork}
            label="Cherry-pick Commit"
            size={13}
            disabled={acting || busy}
            onClick={openCherryPickModal}
          />
          <IconButton
            icon={RefreshCw}
            label="Refresh"
            size={13}
            disabled={acting || busy || loading}
            onClick={() => void refresh()}
          />
        </div>
      </div>

      {error ? <p className="scm-panel__error">{error}</p> : null}

      {/* Rebase / Cherry-pick In-Progress Banner */}
      {(() => {
        const banner = formatRebaseStatusBanner(rebaseStatus);
        if (!banner) return null;
        return (
          <div
            className={`scm-panel__in-progress-banner ${banner.isCherryPick ? "scm-panel__in-progress-banner--cherry" : ""}`}
            role="alert"
          >
            <div className="scm-panel__in-progress-info">
              <span className="scm-panel__in-progress-dot" />
              <div className="scm-panel__in-progress-text">
                <div className="scm-panel__in-progress-title">{banner.title}</div>
                {banner.subtitle ? (
                  <div className="scm-panel__in-progress-sub">{banner.subtitle}</div>
                ) : null}
              </div>
            </div>
            <div className="scm-panel__in-progress-actions">
              {banner.canContinue ? (
                <button
                  type="button"
                  className="scm-panel__banner-btn scm-panel__banner-btn--primary"
                  disabled={acting}
                  onClick={() =>
                    void (banner.isCherryPick
                      ? handleCherryPickContinue()
                      : handleRebaseContinue())
                  }
                >
                  Continue
                </button>
              ) : null}
              {banner.canSkip ? (
                <button
                  type="button"
                  className="scm-panel__banner-btn"
                  disabled={acting}
                  onClick={() => void handleRebaseSkip()}
                >
                  Skip
                </button>
              ) : null}
              {banner.canAbort ? (
                <button
                  type="button"
                  className="scm-panel__banner-btn scm-panel__banner-btn--danger"
                  disabled={acting}
                  onClick={() =>
                    void (banner.isCherryPick
                      ? handleCherryPickAbort()
                      : handleRebaseAbort())
                  }
                >
                  Abort
                </button>
              ) : null}
            </div>
          </div>
        );
      })()}

      {/* Commit Box */}
      <div className="scm-panel__commit">
        <textarea
          id="scm-commit-message"
          className="scm-panel__message"
          rows={3}
          placeholder="Message (Ctrl+Enter to commit)"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={onCommitKeyDown}
        />
        <div className="scm-panel__commit-footer">
          <label className="scm-panel__amend">
            <input
              type="checkbox"
              checked={amend}
              onChange={(event) => setAmend(event.target.checked)}
            />
            <span>Amend</span>
          </label>
          <div className="scm-panel__msg-helpers">
            <button
              type="button"
              className="scm-panel__text-btn"
              onClick={() => {
                void navigator.clipboard.readText().then((text) => {
                  const next = text.trim();
                  if (next) setMessage(next);
                });
              }}
            >
              Paste
            </button>
            {message ? (
              <button
                type="button"
                className="scm-panel__text-btn"
                onClick={() => setMessage("")}
              >
                Clear
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="scm-panel__commit-btn"
            disabled={
              acting ||
              busy ||
              (!amend && (!message.trim() || staged.length === 0))
            }
            onClick={handleCommit}
          >
            {amend ? "Amend Commit" : "Commit"}
          </button>
        </div>
      </div>

      {/* Batch Selection Action Bar (Appears when items are checked) */}
      {selectedPaths.length > 0 ? (
        <div className="scm-panel__batch-bar">
          <span>{selectedPaths.length} selected</span>
          <div className="scm-panel__batch-actions">
            {selectedUnstaged.length > 0 ? (
              <button
                type="button"
                className="scm-panel__batch-btn"
                disabled={acting}
                onClick={() => void run("git_stage", { paths: selectedUnstaged })}
              >
                Stage
              </button>
            ) : null}
            {selectedStaged.length > 0 ? (
              <button
                type="button"
                className="scm-panel__batch-btn"
                disabled={acting}
                onClick={() => void run("git_unstage", { paths: selectedStaged })}
              >
                Unstage
              </button>
            ) : null}
            {selectedUnstaged.length > 0 ? (
              <button
                type="button"
                className="scm-panel__batch-btn scm-panel__batch-btn--danger"
                disabled={acting}
                onClick={() => {
                  const ok = window.confirm(`Discard ${selectedUnstaged.length} selected file(s)?`);
                  if (!ok) return;
                  void (async () => {
                    for (const p of selectedUnstaged) {
                      const entry = unstaged.find((item) => item.path === p);
                      if (entry) discardEntry(entry);
                    }
                  })();
                }}
              >
                Discard
              </button>
            ) : null}
            <button
              type="button"
              className="scm-panel__batch-btn"
              onClick={() => setSelected(new Set())}
            >
              Deselect
            </button>
          </div>
        </div>
      ) : null}

      {/* Changes list area */}
      <div className="scm-panel__lists">
        {loading && !summary ? <p className="scm-panel__hint">Loading git status…</p> : null}
        {summary && summary.entries.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title="Working tree clean"
            description="No changes to commit."
          />
        ) : null}

        {/* Staged Changes Section */}
        {staged.length > 0 ? (
          <div className="scm-panel__section">
            <div className="scm-panel__section-header">
              <button
                type="button"
                className="scm-panel__section-toggle"
                onClick={() => setStagedCollapsed((v) => !v)}
              >
                {stagedCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Staged Changes</span>
                <span className="scm-panel__badge">{staged.length}</span>
              </button>
              <IconButton
                icon={Minus}
                label="Unstage all changes"
                size={13}
                disabled={acting}
                onClick={() => void run("git_unstage", { paths: staged.map((e) => e.path) })}
              />
            </div>
            {!stagedCollapsed ? (
              <ul className="scm-panel__list">
                {staged.map((entry) => renderFileRow(entry, true))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Unstaged Changes Section */}
        {unstaged.length > 0 ? (
          <div className="scm-panel__section">
            <div className="scm-panel__section-header">
              <button
                type="button"
                className="scm-panel__section-toggle"
                onClick={() => setChangesCollapsed((v) => !v)}
              >
                {changesCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Changes</span>
                <span className="scm-panel__badge">{unstaged.length}</span>
              </button>
              <div className="scm-panel__section-actions">
                <IconButton
                  icon={Plus}
                  label="Stage all changes"
                  size={13}
                  disabled={acting}
                  onClick={() => void run("git_stage", { paths: unstaged.map((e) => e.path) })}
                />
                <IconButton
                  icon={Undo2}
                  label="Discard all changes"
                  size={13}
                  disabled={acting}
                  onClick={() => {
                    const ok = window.confirm(`Discard all unstaged changes in ${unstaged.length} file(s)?`);
                    if (!ok) return;
                    void (async () => {
                      for (const entry of unstaged) {
                        discardEntry(entry);
                      }
                    })();
                  }}
                />
              </div>
            </div>
            {!changesCollapsed ? (
              <ul className="scm-panel__list">
                {unstaged.map((entry) => renderFileRow(entry, false))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Submodules Section */}
        {submodules.length > 0 ? (
          <div className="scm-panel__section">
            <div className="scm-panel__section-header">
              <button
                type="button"
                className="scm-panel__section-toggle"
                onClick={() => setSubmodulesCollapsed((v) => !v)}
              >
                {submodulesCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Submodules</span>
                <span className="scm-panel__badge">{submodules.length}</span>
              </button>
              <div className="scm-panel__section-actions">
                <IconButton
                  icon={RefreshCw}
                  label="Update All (Recursive)"
                  size={13}
                  disabled={acting}
                  onClick={() => void handleSubmoduleUpdateAll()}
                />
                <IconButton
                  icon={GitCompare}
                  label="Sync All"
                  size={13}
                  disabled={acting}
                  onClick={() => void handleSubmoduleSyncAll()}
                />
              </div>
            </div>
            {!submodulesCollapsed ? (
              <ul className="scm-panel__list scm-panel__list--submodules">
                {submodules.map((sub) => renderSubmoduleRow(sub))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Tags Section */}
        {summary ? (
          <div className="scm-panel__section scm-panel__section--tags">
            <div className="scm-panel__section-header">
              <button
                type="button"
                className="scm-panel__section-toggle"
                onClick={() => setTagsCollapsed((v) => !v)}
              >
                {tagsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>Tags</span>
                <span className="scm-panel__badge">{tags.length}</span>
              </button>
              <div className="scm-panel__section-actions">
                <IconButton
                  icon={Plus}
                  label="Create Tag"
                  size={13}
                  disabled={acting}
                  onClick={() => {
                    setTagsCollapsed(false);
                    setShowCreateTagDialog((v) => !v);
                    setTagError(null);
                  }}
                />
                <IconButton
                  icon={ArrowUp}
                  label="Push Tags"
                  size={13}
                  disabled={acting}
                  onClick={() => void handlePushTags()}
                />
              </div>
            </div>

            {!tagsCollapsed ? (
              <div className="scm-panel__tags-content">
                {showCreateTagDialog ? (
                  <div className="scm-panel__tag-create-form island">
                    <div className="scm-panel__tag-create-title">Create New Tag</div>
                    <input
                      type="text"
                      className="scm-panel__tag-input"
                      placeholder="Tag name (e.g. v1.0.0)"
                      value={newTagName}
                      autoFocus
                      onChange={(e) => {
                        setNewTagName(e.target.value);
                        if (tagError) setTagError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateTagSubmit();
                        if (e.key === "Escape") resetCreateTagForm();
                      }}
                    />
                    <input
                      type="text"
                      className="scm-panel__tag-input"
                      placeholder="Target commit (optional, defaults to HEAD)"
                      value={newTagTarget}
                      onChange={(e) => setNewTagTarget(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateTagSubmit();
                        if (e.key === "Escape") resetCreateTagForm();
                      }}
                    />
                    <input
                      type="text"
                      className="scm-panel__tag-input"
                      placeholder="Annotation message (optional)"
                      value={newTagMessage}
                      onChange={(e) => setNewTagMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateTagSubmit();
                        if (e.key === "Escape") resetCreateTagForm();
                      }}
                    />
                    {tagError ? (
                      <div className="scm-panel__error scm-panel__tag-error">{tagError}</div>
                    ) : null}
                    <div className="scm-panel__tag-form-actions">
                      <button
                        type="button"
                        className="scm-panel__batch-btn scm-panel__tag-submit-btn"
                        disabled={acting || !newTagName.trim()}
                        onClick={() => void handleCreateTagSubmit()}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        className="scm-panel__batch-btn"
                        onClick={resetCreateTagForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {tags.length > 3 || tagQuery ? (
                  <div className="scm-panel__tag-filter-row">
                    <input
                      type="text"
                      className="scm-panel__tag-filter-input"
                      placeholder="Filter tags..."
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                    />
                    {tagQuery ? (
                      <button
                        type="button"
                        className="scm-panel__tag-filter-clear"
                        onClick={() => setTagQuery("")}
                        title="Clear filter"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {tags.length === 0 && !showCreateTagDialog ? (
                  <div className="scm-panel__tags-empty">No tags found. Click + to create one.</div>
                ) : filterTags(tags, tagQuery).length === 0 && tagQuery ? (
                  <div className="scm-panel__tags-empty">No tags matching "{tagQuery}".</div>
                ) : (
                  <ul className="scm-panel__list scm-panel__list--tags">
                    {filterTags(tags, tagQuery).map((tag) => renderTagRow(tag))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Interactive Rebase Modal */}
      {showRebaseDialog ? (
        <div
          className="scm-panel__modal-overlay"
          onClick={() => setShowRebaseDialog(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowRebaseDialog(false);
          }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scm-rebase-title"
        >
          <div
            className="scm-panel__modal island"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scm-panel__modal-header">
              <div className="scm-panel__modal-title" id="scm-rebase-title">
                <GitCommit size={14} className="scm-panel__modal-icon" />
                <span>Interactive Git Rebase</span>
              </div>
              <button
                type="button"
                className="scm-panel__modal-close"
                onClick={() => setShowRebaseDialog(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="scm-panel__modal-body">
              <div className="scm-panel__modal-field">
                <label className="scm-panel__modal-label" htmlFor="scm-rebase-upstream">
                  Rebase onto upstream base:
                </label>
                <div className="scm-panel__rebase-base-row">
                  <input
                    id="scm-rebase-upstream"
                    type="text"
                    className="scm-panel__modal-input"
                    placeholder="Branch or commit (e.g. main, HEAD~3, --root)"
                    value={rebaseUpstream}
                    onChange={(e) => setRebaseUpstream(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && rebaseUpstream.trim() && !rebaseLoading) {
                        void loadRebaseTodos(rebaseUpstream);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="scm-panel__batch-btn"
                    disabled={rebaseLoading || !rebaseUpstream.trim()}
                    onClick={() => void loadRebaseTodos(rebaseUpstream)}
                  >
                    {rebaseLoading ? "Loading..." : "Load Commits"}
                  </button>
                </div>
              </div>

              {rebaseError ? (
                <div className="scm-panel__error scm-panel__modal-error">{rebaseError}</div>
              ) : null}

              {rebaseItems.length > 0 ? (
                <div className="scm-panel__rebase-list-wrap">
                  <div className="scm-panel__rebase-list-header">
                    <span>Order & Action</span>
                    <span>Commit Details</span>
                  </div>
                  <div className="scm-panel__rebase-items">
                    {rebaseItems.map((item, idx) => (
                      <div
                        key={`${item.sha}-${idx}`}
                        className={`scm-panel__rebase-row ${item.action === "drop" ? "scm-panel__rebase-row--drop" : ""}`}
                      >
                        <div className="scm-panel__rebase-row-controls">
                          <button
                            type="button"
                            className="scm-panel__rebase-reorder-btn"
                            disabled={idx === 0}
                            onClick={() =>
                              setRebaseItems((items) => moveTodoItem(items, idx, idx - 1))
                            }
                            title="Move commit up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="scm-panel__rebase-reorder-btn"
                            disabled={idx === rebaseItems.length - 1}
                            onClick={() =>
                              setRebaseItems((items) => moveTodoItem(items, idx, idx + 1))
                            }
                            title="Move commit down"
                          >
                            ▼
                          </button>
                          <select
                            className="scm-panel__rebase-action-select"
                            value={item.action}
                            aria-label={`Action for commit ${item.short_sha}`}
                            onChange={(e) =>
                              setRebaseItems((items) =>
                                updateTodoAction(
                                  items,
                                  idx,
                                  e.target.value as RebaseAction,
                                )
                              )
                            }
                          >
                            <option value="pick">pick</option>
                            <option value="reword">reword</option>
                            <option value="edit">edit</option>
                            <option value="squash">squash</option>
                            <option value="fixup">fixup</option>
                            <option value="drop">drop</option>
                          </select>
                        </div>

                        <div className="scm-panel__rebase-row-details">
                          <div className="scm-panel__rebase-row-meta">
                            <span className="scm-panel__rebase-sha">{item.short_sha}</span>
                            {item.author ? (
                              <span className="scm-panel__rebase-author">{item.author}</span>
                            ) : null}
                            {item.date ? (
                              <span className="scm-panel__rebase-date">{item.date}</span>
                            ) : null}
                          </div>
                          {item.action === "reword" ? (
                            <input
                              type="text"
                              className="scm-panel__rebase-message-input"
                              value={item.message}
                              onChange={(e) =>
                                setRebaseItems((items) =>
                                  updateTodoMessage(items, idx, e.target.value)
                                )
                              }
                              placeholder="Edit commit message inline"
                            />
                          ) : (
                            <div className="scm-panel__rebase-message" title={item.message}>
                              {item.message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !rebaseLoading ? (
                <div className="scm-panel__rebase-empty">
                  Enter an upstream branch/base (e.g. <code>main</code> or <code>HEAD~3</code>) and click "Load Commits".
                </div>
              ) : null}
            </div>

            <div className="scm-panel__modal-footer">
              <button
                type="button"
                className="scm-panel__batch-btn"
                onClick={() => setShowRebaseDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scm-panel__batch-btn scm-panel__tag-submit-btn"
                disabled={
                  acting ||
                  rebaseLoading ||
                  rebaseItems.length === 0 ||
                  !validateRebaseTodo(rebaseItems).valid
                }
                onClick={() => void handleStartRebase()}
              >
                Start Rebase
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cherry-pick Dialog */}
      {showCherryPickDialog ? (
        <div
          className="scm-panel__modal-overlay"
          onClick={() => setShowCherryPickDialog(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCherryPickDialog(false);
          }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scm-cherry-pick-title"
        >
          <div
            className="scm-panel__modal island"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scm-panel__modal-header">
              <div className="scm-panel__modal-title" id="scm-cherry-pick-title">
                <GitFork size={14} className="scm-panel__modal-icon" />
                <span>Cherry-pick Commit</span>
              </div>
              <button
                type="button"
                className="scm-panel__modal-close"
                onClick={() => setShowCherryPickDialog(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="scm-panel__modal-body">
              <div className="scm-panel__modal-field">
                <label className="scm-panel__modal-label" htmlFor="scm-cp-branch">
                  Browse commits from branch:
                </label>
                <select
                  id="scm-cp-branch"
                  className="scm-panel__modal-select"
                  value={cherryPickBranch}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCherryPickBranch(next);
                    if (next) void loadCherryPickCommits(next);
                  }}
                >
                  <option value="">(Select a branch to browse commits)</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {cherryPickLoading ? (
                <div className="scm-panel__rebase-empty">
                  Loading commits from {cherryPickBranch}...
                </div>
              ) : cherryPickCommits.length > 0 ? (
                <div className="scm-panel__cp-commits-wrap">
                  <label className="scm-panel__modal-label">
                    Select a commit from {cherryPickBranch}:
                  </label>
                  <div className="scm-panel__cp-commits-list">
                    {cherryPickCommits.map((c) => (
                      <button
                        key={c.sha}
                        type="button"
                        className={`scm-panel__cp-commit-btn ${cherryPickCommitSha === c.sha ? "scm-panel__cp-commit-btn--selected" : ""}`}
                        onClick={() => setCherryPickCommitSha(c.sha)}
                      >
                        <span className="scm-panel__rebase-sha">{c.short_sha}</span>
                        <span className="scm-panel__cp-commit-msg" title={c.message}>
                          {c.message}
                        </span>
                        <span className="scm-panel__rebase-date">{c.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="scm-panel__modal-field">
                <label className="scm-panel__modal-label" htmlFor="scm-cp-commit-sha">
                  Commit SHA to cherry-pick:
                </label>
                <input
                  id="scm-cp-commit-sha"
                  type="text"
                  className="scm-panel__modal-input"
                  placeholder="e.g. 7a4266f or full commit SHA"
                  value={cherryPickCommitSha}
                  onChange={(e) => setCherryPickCommitSha(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cherryPickCommitSha.trim() && !acting) {
                      void handleCherryPickSubmit();
                    }
                  }}
                />
              </div>

              <label className="scm-panel__cp-checkbox-row">
                <input
                  type="checkbox"
                  checked={cherryPickNoCommit}
                  onChange={(e) => setCherryPickNoCommit(e.target.checked)}
                />
                <span>
                  Stage changes without committing (<code>--no-commit</code> / <code>-n</code>)
                </span>
              </label>

              {cherryPickError ? (
                <div className="scm-panel__error scm-panel__modal-error">
                  {cherryPickError}
                </div>
              ) : null}
            </div>

            <div className="scm-panel__modal-footer">
              <button
                type="button"
                className="scm-panel__batch-btn"
                onClick={() => setShowCherryPickDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scm-panel__batch-btn scm-panel__tag-submit-btn"
                disabled={acting || !cherryPickCommitSha.trim()}
                onClick={() => void handleCherryPickSubmit()}
              >
                Cherry-pick
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SCM Row Context Menu */}
      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="scm-panel__context-menu island"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openDiff(contextMenu.entry, contextMenu.isStaged);
              setContextMenu(null);
            }}
          >
            Open Diff
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const relative = contextMenu.entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
              void openFile(joinPath(rootPath, relative));
              setContextMenu(null);
            }}
          >
            Open File
          </button>
          {contextMenu.isStaged ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void run("git_unstage", { paths: [contextMenu.entry.path] });
                setContextMenu(null);
              }}
            >
              Unstage Changes
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void run("git_stage", { paths: [contextMenu.entry.path] });
                  setContextMenu(null);
                }}
              >
                Stage Changes
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  discardEntry(contextMenu.entry);
                  setContextMenu(null);
                }}
              >
                Discard Changes
              </button>
            </>
          )}
          <div className="scm-panel__menu-sep" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard.writeText(contextMenu.entry.path);
              setContextMenu(null);
            }}
          >
            Copy Relative Path
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const relative = contextMenu.entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
              void navigator.clipboard.writeText(joinPath(rootPath, relative));
              setContextMenu(null);
            }}
          >
            Copy Absolute Path
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const relative = contextMenu.entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
              void revealItemInDir(joinPath(rootPath, relative));
              setContextMenu(null);
            }}
          >
            Reveal in File Explorer
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void run("git_ignore", { path: contextMenu.entry.path });
              setContextMenu(null);
            }}
          >
            Add to .gitignore
          </button>
        </div>
      ) : null}
    </div>
  );
}
