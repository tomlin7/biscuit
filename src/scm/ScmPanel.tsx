import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Minus,
  Plus,
  RefreshCw,
  Undo2,
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { joinPath } from "../workspace/path";
import { appendLog } from "../logs/logBus";
import { openDiffTab } from "./diffBus";
import { readIgnoreSpacePref } from "./diffPrefs";
import { setToggleAmendListener } from "./amendBus";
import { setScmRemoteListener, type ScmRemoteAction } from "./scmRemoteBus";
import { IconButton } from "../ui/IconButton";
import { FileIcon } from "../ui/FileIcon";
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
  const { rootPath, openFile, busy, tabs, applyDiskValue, closeTab } = useWorkspace();
  const [summary, setSummary] = useState<GitSummary | null>(null);
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

  const refresh = useCallback(async () => {
    if (!rootPath) {
      setSummary(null);
      setBranches([]);
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
    } catch (err) {
      setSummary(null);
      setBranches([]);
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
      } else void push();
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
        <p className="scm-panel__hint">Open a folder to view Git status.</p>
      </div>
    );
  }

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
            icon={RefreshCw}
            label="Refresh"
            size={13}
            disabled={acting || busy || loading}
            onClick={() => void refresh()}
          />
        </div>
      </div>

      {error ? <p className="scm-panel__error">{error}</p> : null}

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
          <p className="scm-panel__hint">Working tree clean. No changes.</p>
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
      </div>

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
