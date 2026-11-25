import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { joinPath } from "../workspace/path";
import { appendLog } from "../logs/logBus";
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
};

type Props = {
  onBranch: (branch: string | null) => void;
};

export function ScmPanel({ onBranch }: Props) {
  const { rootPath, openFile, busy } = useWorkspace();
  const [summary, setSummary] = useState<GitSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [acting, setActing] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [diffPath, setDiffPath] = useState<string | null>(null);

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
      onBranch(next.branch);
      const names = await invoke<string[]>("git_branches", { cwd: rootPath });
      setBranches(names);
    } catch (err) {
      setSummary(null);
      setBranches([]);
      onBranch(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [rootPath, onBranch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (command: string, args: Record<string, unknown>) => {
    if (!rootPath) return false;
    setActing(true);
    setError(null);
    try {
      await invoke(command, { cwd: rootPath, ...args });
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

  const staged = summary?.entries.filter((entry) => entry.index !== " " && entry.index !== "?") ?? [];
  const unstaged =
    summary?.entries.filter((entry) => entry.worktree !== " " || entry.index === "?") ?? [];

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
            disabled={acting || busy}
            onClick={() => void run("git_pull", {})}
          >
            Pull
          </button>
          <button
            type="button"
            className="scm-panel__refresh"
            disabled={acting || busy}
            onClick={() => void run("git_push", {})}
          >
            Push
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
            <button
              key={branch}
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
        </div>
        <button
          type="button"
          className="scm-panel__commit-btn"
          disabled={acting || busy || !message.trim() || staged.length === 0}
          onClick={() => {
            const text = message.trim();
            void run("git_commit", { message: text }).then((ok) => {
              if (ok) setMessage("");
            });
          }}
        >
          Commit
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
              <button
                type="button"
                className="scm-panel__file"
                onClick={() => {
                  const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
                  void openFile(joinPath(rootPath, relative));
                }}
                title={entry.path}
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
                    void run("git_discard", { path: entry.path, untracked });
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
                  if (diffPath === entry.path) {
                    setDiffPath(null);
                    setDiffText(null);
                    return;
                  }
                  const staged = entry.index !== " " && entry.index !== "?" && entry.worktree === " ";
                  void invoke<string>("git_diff", {
                    cwd: rootPath,
                    path: entry.path,
                    staged,
                  })
                    .then((text) => {
                      setDiffPath(entry.path);
                      setDiffText(text);
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : String(err));
                    });
                }}
              >
                Diff
              </button>
            </div>
            {diffPath === entry.path && diffText ? (
              <pre className="scm-panel__diff">{diffText}</pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
