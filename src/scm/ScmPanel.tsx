import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { joinPath } from "../workspace/path";
import { appendLog } from "../logs/logBus";
import { openDiffTab } from "./diffBus";
import { readIgnoreSpacePref } from "./diffPrefs";
import { setToggleAmendListener } from "./amendBus";
import { setScmRemoteListener, type ScmRemoteAction } from "./scmRemoteBus";
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

  const run = async (command: string, args: Record<string, unknown> = {}) => {
    if (!rootPath) return false;
    setActing(true);
    setError(null);
    try {
      const result = await invoke<unknown>(command, { cwd: rootPath, ...args });
      if (typeof result === "string" && result.trim()) {
        appendLog(result.trim());
      }
      await refresh();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      appendLog(`Git failed: ${message}`);
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
        const message = window.prompt("Stash message (optional)") ?? undefined;
        void run("git_stash_push", { message: message?.trim() || null });
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
            const relative = entry.path.replace(
              /\//g,
              rootPath.includes("\\") ? "\\" : "/",
            );
            const absolute = joinPath(rootPath, relative);
            const open = tabs.find(
              (tab) =>
                tab.path.replace(/\\/g, "/").toLowerCase() ===
                absolute.replace(/\\/g, "/").toLowerCase(),
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
      } else if (action === "copyRelative") {
        if (selectedPaths.length === 0) return;
        void navigator.clipboard.writeText(selectedPaths.join("\n"));
      } else if (action === "copyAbsolute") {
        if (selectedPaths.length === 0 || !rootPath) return;
        const absolutes = selectedPaths.map((path) => {
          const relative = path.replace(
            /\//g,
            rootPath.includes("\\") ? "\\" : "/",
          );
          return joinPath(rootPath, relative);
        });
        void navigator.clipboard.writeText(absolutes.join("\n"));
      } else if (action === "openSelected") {
        if (selectedPaths.length === 0 || !rootPath) return;
        void (async () => {
          for (const path of selectedPaths) {
            const relative = path.replace(
              /\//g,
              rootPath.includes("\\") ? "\\" : "/",
            );
            await openFile(joinPath(rootPath, relative));
          }
        })();
      } else if (action === "selectAll") {
        if (!summary?.entries.length) return;
        setSelected(new Set(summary.entries.map((entry) => entry.path)));
      } else if (action === "deselectAll") {
        setSelected(new Set());
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

  if (!rootPath) {
    return (
      <div className="scm-panel scm-panel--empty">
        <p className="scm-panel__hint">Open a folder to view Git status.</p>
      </div>
    );
  }

  return (
    <div className="scm-panel">
      <div className="scm-panel__toolbar">
        <span className="scm-panel__branch">
          {summary?.branch ?? (loading ? "…" : "—")}
        </span>
        <span className="scm-panel__toolbar-actions">
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={!summary?.branch}
            title="Copy current branch name"
            onClick={() => {
              if (!summary?.branch) return;
              void navigator.clipboard.writeText(summary.branch);
            }}
          >
            Copy branch
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => void run("git_pull", {})}
          >
            Pull
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => void run("git_fetch", {})}
          >
            Fetch
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => void push()}
          >
            Push
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => {
              const name = window.prompt("New branch name")?.trim();
              if (!name) return;
              void run("git_create_branch", { branch: name });
            }}
          >
            New branch
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => {
              const message = window.prompt("Stash message (optional)") ?? undefined;
              void run("git_stash_push", { message: message?.trim() || null });
            }}
          >
            Stash
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => void run("git_stash_pop", {})}
          >
            Pop stash
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            onClick={() => void refresh()}
            disabled={busy || loading}
          >
            Refresh
          </button>
        </span>
      </div>
      {branches.length > 0 ? (
        <div className="scm-panel__branches">
          {branches.map((branch) => (
            <div key={branch} className="scm-panel__branch-row">
              <button
                type="button"
                className={
                  branch === summary?.branch
                    ? "scm-panel__branch-btn scm-panel__branch-btn--current"
                    : "scm-panel__branch-btn"
                }
                disabled={acting || branch === summary?.branch}
                onClick={() => void run("git_checkout", { branch })}
              >
                {branch}
              </button>
              {branch !== summary?.branch ? (
                <button
                  type="button"
                  className="scm-panel__branch-delete"
                  title={`Delete branch ${branch}`}
                  disabled={acting}
                  onClick={() => {
                    void (async () => {
                      const ok = window.confirm(
                        `Delete local branch "${branch}"?`,
                      );
                      if (!ok) return;
                      const soft = await run("git_delete_branch", {
                        branch,
                        force: false,
                      });
                      if (soft) return;
                      const force = window.confirm(
                        `Branch "${branch}" is not fully merged. Force delete with git branch -D?`,
                      );
                      if (!force) return;
                      await run("git_delete_branch", { branch, force: true });
                    })();
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="scm-panel__error">{error}</p> : null}
      <div className="scm-panel__commit">
        <textarea
          className="scm-panel__message"
          rows={3}
          placeholder="Commit message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="scm-panel__bulk">
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting}
            onClick={() => {
              void navigator.clipboard.readText().then((text) => {
                const next = text.trim();
                if (next) setMessage(next);
              });
            }}
          >
            Paste message
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || !message.trim()}
            onClick={() => setMessage("")}
          >
            Clear message
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || !summary || summary.entries.length === 0}
            onClick={() => {
              if (!summary) return;
              setSelected(new Set(summary.entries.map((entry) => entry.path)));
            }}
          >
            Select all
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0}
            onClick={() => setSelected(new Set())}
          >
            Deselect all
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedUnstaged.length === 0}
            onClick={() => void run("git_stage", { paths: selectedUnstaged })}
          >
            Stage selected
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedStaged.length === 0}
            onClick={() => void run("git_unstage", { paths: selectedStaged })}
          >
            Unstage selected
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || unstaged.length === 0}
            onClick={() => void run("git_stage", { paths: unstaged.map((entry) => entry.path) })}
          >
            Stage all
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || staged.length === 0}
            onClick={() => void run("git_unstage", { paths: staged.map((entry) => entry.path) })}
          >
            Unstage all
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedUnstaged.length === 0}
            onClick={() => {
              const ok = window.confirm(
                `Discard changes in ${selectedUnstaged.length} selected path(s)?`,
              );
              if (!ok) return;
              void (async () => {
                for (const path of selectedUnstaged) {
                  const entry = unstaged.find((item) => item.path === path);
                  if (!entry) continue;
                  const untracked = entry.index === "?";
                  const succeeded = await run("git_discard", {
                    path: entry.path,
                    untracked,
                  });
                  if (!succeeded || !rootPath) continue;
                  const relative = entry.path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  const absolute = joinPath(rootPath, relative);
                  const openTab = tabs.find(
                    (tab) =>
                      tab.path.replace(/\\/g, "/").toLowerCase() ===
                      absolute.replace(/\\/g, "/").toLowerCase(),
                  );
                  if (!openTab) continue;
                  if (untracked) {
                    closeTab(openTab.path);
                    continue;
                  }
                  try {
                    const text = await readTextFile(absolute);
                    applyDiskValue(openTab.path, text);
                  } catch {
                    closeTab(openTab.path);
                  }
                }
              })();
            }}
          >
            Discard selected
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || unstaged.length === 0}
            onClick={() => {
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
                  const relative = entry.path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  const absolute = joinPath(rootPath, relative);
                  const open = tabs.find(
                    (tab) =>
                      tab.path.replace(/\\/g, "/").toLowerCase() ===
                      absolute.replace(/\\/g, "/").toLowerCase(),
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
            }}
          >
            Discard all
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0 || !rootPath}
            onClick={() => {
              if (!rootPath) return;
              void (async () => {
                for (const path of selectedPaths) {
                  const relative = path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  await openFile(joinPath(rootPath, relative));
                }
              })();
            }}
          >
            Open selected
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0 || !rootPath}
            onClick={() => {
              if (!rootPath) return;
              const absolutes = selectedPaths.map((path) => {
                const relative = path.replace(
                  /\//g,
                  rootPath.includes("\\") ? "\\" : "/",
                );
                return joinPath(rootPath, relative);
              });
              void navigator.clipboard.writeText(absolutes.join("\n"));
            }}
          >
            Copy path
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0}
            onClick={() => {
              void navigator.clipboard.writeText(selectedPaths.join("\n"));
            }}
          >
            Copy relative path
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0}
            onClick={() => {
              void (async () => {
                for (const path of selectedPaths) {
                  await run("git_ignore", { path });
                }
              })();
            }}
          >
            Ignore selected
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || selectedPaths.length === 0 || !rootPath}
            onClick={() => {
              if (!rootPath) return;
              const targets = selectedPaths.map((path) => {
                const relative = path.replace(
                  /\//g,
                  rootPath.includes("\\") ? "\\" : "/",
                );
                return joinPath(rootPath, relative);
              });
              void revealItemInDir(targets).catch((err) => {
                setError(err instanceof Error ? err.message : String(err));
              });
            }}
          >
            Reveal in Explorer
          </button>
        </div>
        <label className="scm-panel__amend">
          <input
            type="checkbox"
            checked={amend}
            onChange={(event) => {
              const next = event.target.checked;
              if (next && !canAmend) {
                const ok = window.confirm(
                  "HEAD may already be on the remote. Amend anyway?",
                );
                if (!ok) return;
              }
              setAmend(next);
            }}
          />
          <span>Amend last commit{canAmend ? "" : " (may be published)"}</span>
        </label>
        <button
          type="button"
          className="scm-panel__commit-btn"
          disabled={
            acting ||
            busy ||
            (!amend && (!message.trim() || staged.length === 0))
          }
          onClick={() => {
            const text = message.trim();
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
          }}
        >
          {amend ? "Amend" : "Commit"}
        </button>
      </div>
      {loading && !summary ? <p className="scm-panel__hint">Loading…</p> : null}
      {summary && summary.entries.length === 0 ? (
        <p className="scm-panel__hint">Working tree clean.</p>
      ) : null}
      <ul className="scm-panel__list">
        {summary?.entries.map((entry) => (
          <li key={entry.path}>
            <div className="scm-panel__row">
              <label className="scm-panel__check">
                <input
                  type="checkbox"
                  checked={selected.has(entry.path)}
                  onChange={() => toggleSelected(entry.path)}
                  aria-label={`Select ${entry.path}`}
                />
              </label>
              <button
                type="button"
                className="scm-panel__file"
                onClick={() => {
                  const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
                  void openFile(joinPath(rootPath, relative));
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const canStage = entry.worktree !== " " || entry.index === "?";
                  const canUnstage = entry.index !== " " && entry.index !== "?";
                  if (canStage) {
                    void run("git_stage", { paths: [entry.path] });
                    return;
                  }
                  if (canUnstage) {
                    void run("git_unstage", { paths: [entry.path] });
                    return;
                  }
                  const relative = entry.path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  void openFile(joinPath(rootPath, relative));
                }}
                title={`${entry.path} — Enter to stage, unstage, or open`}
              >
                <span className="scm-panel__status">{entry.status}</span>
                <span className="scm-panel__path">{entry.path}</span>
              </button>
              {entry.worktree !== " " || entry.index === "?" ? (
                <button
                  type="button"
                  className="scm-panel__action"
                  disabled={acting}
                  onClick={() => void run("git_stage", { paths: [entry.path] })}
                >
                  Stage
                </button>
              ) : null}
              {entry.index !== " " && entry.index !== "?" ? (
                <button
                  type="button"
                  className="scm-panel__action"
                  disabled={acting}
                  onClick={() => void run("git_unstage", { paths: [entry.path] })}
                >
                  Unstage
                </button>
              ) : null}
              {entry.worktree !== " " || entry.index === "?" ? (
                <button
                  type="button"
                  className="scm-panel__action"
                  disabled={acting}
                  onClick={() => {
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
                      const relative = entry.path.replace(
                        /\//g,
                        rootPath.includes("\\") ? "\\" : "/",
                      );
                      const absolute = joinPath(rootPath, relative);
                      const open = tabs.find(
                        (tab) =>
                          tab.path.replace(/\\/g, "/").toLowerCase() ===
                          absolute.replace(/\\/g, "/").toLowerCase(),
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
                  }}
                >
                  Discard
                </button>
              ) : null}
              <button
                type="button"
                className="scm-panel__action"
                disabled={acting}
                onClick={() => void run("git_ignore", { path: entry.path })}
              >
                Ignore
              </button>
              <button
                type="button"
                className="scm-panel__action"
                disabled={acting}
                onClick={() => {
                  const relative = entry.path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  const absolute = joinPath(rootPath, relative);
                  void (async () => {
                    try {
                      const ignoreSpace = readIgnoreSpacePref();
                      const text = await invoke<string>("git_diff", {
                        cwd: rootPath,
                        path: entry.path,
                        staged: false,
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
                        staged: false,
                        ignoreSpace,
                      });
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err));
                    }
                  })();
                }}
              >
                Compare HEAD
              </button>
              <button
                type="button"
                className="scm-panel__action"
                disabled={acting}
                onClick={() => {
                  const stagedOnly =
                    entry.index !== " " && entry.index !== "?" && entry.worktree === " ";
                  const relative = entry.path.replace(
                    /\//g,
                    rootPath.includes("\\") ? "\\" : "/",
                  );
                  const absolute = joinPath(rootPath, relative);
                  void (async () => {
                    try {
                      const ignoreSpace = readIgnoreSpacePref();
                      const text = await invoke<string>("git_diff", {
                        cwd: rootPath,
                        path: entry.path,
                        staged: stagedOnly,
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
                        staged: stagedOnly,
                        ignoreSpace,
                      });
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err));
                    }
                  })();
                }}
              >
                Diff
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
