import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { joinPath } from "../workspace/path";
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

  const refresh = useCallback(async () => {
    if (!rootPath) {
      setSummary(null);
      onBranch(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await invoke<GitSummary>("git_summary", { cwd: rootPath });
      setSummary(next);
      onBranch(next.branch);
    } catch (err) {
      setSummary(null);
      onBranch(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [rootPath, onBranch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
        <button
          type="button"
          className="scm-panel__refresh"
          onClick={() => void refresh()}
          disabled={busy || loading}
        >
          Refresh
        </button>
      </div>
      {error ? <p className="scm-panel__error">{error}</p> : null}
      {loading && !summary ? <p className="scm-panel__hint">Loading…</p> : null}
      {summary && summary.entries.length === 0 ? (
        <p className="scm-panel__hint">Working tree clean.</p>
      ) : null}
      <ul className="scm-panel__list">
        {summary?.entries.map((entry) => (
          <li key={entry.path}>
            <button
              type="button"
              className="scm-panel__row"
              onClick={() => {
                const relative = entry.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/");
                void openFile(joinPath(rootPath, relative));
              }}
              title={entry.path}
            >
              <span className="scm-panel__status">{entry.status}</span>
              <span className="scm-panel__path">{entry.path}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
