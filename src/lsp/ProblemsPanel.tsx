import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode,
  Info,
} from "lucide-react";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import {
  nextProblemsFilter,
  setCycleProblemsFilterListener,
} from "./problemsFilterBus";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
import "./ProblemsPanel.css";

type SeverityFilter = "all" | "error" | "warning";

const FILTER_KEY = "t3d.problems.filter.v1";

function loadFilter(): SeverityFilter {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw === "error" || raw === "warning" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return "all";
}

function getRelativeDir(fullPath: string, root: string | null): string {
  if (!root) return "";
  const normFull = fullPath.replace(/\\/g, "/");
  const normRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  if (normFull.startsWith(normRoot)) {
    const rel = normFull.slice(normRoot.length).replace(/^\//, "");
    const parts = rel.split("/");
    parts.pop();
    return parts.join("/") || "./";
  }
  return "";
}

export function ProblemsPanel() {
  const { problems } = useDiagnostics();
  const { rootPath, openFileAt } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(() => loadFilter());

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, severityFilter);
    } catch {
      /* ignore */
    }
  }, [severityFilter]);

  useEffect(() => {
    setCycleProblemsFilterListener(() => {
      setSeverityFilter((current) => nextProblemsFilter(current));
    });
    return () => setCycleProblemsFilterListener(null);
  }, []);

  const errorCount = useMemo(
    () => problems.filter((p) => p.severity === "error").length,
    [problems],
  );
  const warnCount = useMemo(
    () => problems.filter((p) => p.severity === "warning").length,
    [problems],
  );

  const filtered = useMemo(() => {
    if (severityFilter === "all") return problems;
    return problems.filter((problem) => problem.severity === severityFilter);
  }, [problems, severityFilter]);

  const groups = useMemo(() => {
    const rank = (severity: string) => {
      if (severity === "error") return 0;
      if (severity === "warning") return 1;
      if (severity === "info") return 2;
      return 3;
    };
    const map = new Map<string, typeof filtered>();
    for (const problem of filtered) {
      const list = map.get(problem.path) ?? [];
      list.push(problem);
      map.set(problem.path, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, items]) => [
        path,
        [...items].sort((left, right) => {
          const bySev = rank(left.severity) - rank(right.severity);
          if (bySev !== 0) return bySev;
          if (left.line !== right.line) return left.line - right.line;
          return left.column - right.column;
        }),
      ] as const);
  }, [filtered]);

  const toggle = (path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const allCollapsed = groups.length > 0 && collapsed.size === groups.length;

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(groups.map(([path]) => path)));
    }
  };

  return (
    <div className="problems-panel">
      <div className="problems-panel__bar" role="toolbar" aria-label="Problems toolbar">
        <div className="problems-panel__filters">
          <button
            type="button"
            className={`problems-panel__filter ${severityFilter === "all" ? "problems-panel__filter--active" : ""}`}
            aria-pressed={severityFilter === "all"}
            onClick={() => setSeverityFilter("all")}
          >
            <span>All</span>
            <span className="problems-panel__pill-badge">{problems.length}</span>
          </button>
          <button
            type="button"
            className={`problems-panel__filter ${severityFilter === "error" ? "problems-panel__filter--active" : ""}`}
            aria-pressed={severityFilter === "error"}
            onClick={() => setSeverityFilter("error")}
          >
            <AlertCircle size={12} className="problems-panel__btn-icon problems-panel__btn-icon--error" />
            <span>Errors</span>
            <span className="problems-panel__pill-badge">{errorCount}</span>
          </button>
          <button
            type="button"
            className={`problems-panel__filter ${severityFilter === "warning" ? "problems-panel__filter--active" : ""}`}
            aria-pressed={severityFilter === "warning"}
            onClick={() => setSeverityFilter("warning")}
          >
            <AlertTriangle size={12} className="problems-panel__btn-icon problems-panel__btn-icon--warning" />
            <span>Warnings</span>
            <span className="problems-panel__pill-badge">{warnCount}</span>
          </button>
        </div>

        {groups.length > 0 && (
          <div className="problems-panel__actions">
            <IconButton
              icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp}
              label={allCollapsed ? "Expand all files" : "Collapse all files"}
              size={13}
              onClick={toggleAll}
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="problems-panel__empty">
          <p>
            {problems.length === 0
              ? "No problems have been detected in the workspace."
              : "No problems match the current filter."}
          </p>
          {severityFilter !== "all" && problems.length > 0 && (
            <button
              type="button"
              className="problems-panel__reset-btn"
              onClick={() => setSeverityFilter("all")}
            >
              Show all problems ({problems.length})
            </button>
          )}
        </div>
      ) : (
        <ul className="problems-panel__list">
          {groups.map(([path, items]) => {
            const isClosed = collapsed.has(path);
            const dir = getRelativeDir(path, rootPath);
            return (
              <li key={path} className="problems-panel__group">
                <button
                  type="button"
                  className="problems-panel__file"
                  onClick={() => toggle(path)}
                  aria-expanded={!isClosed}
                >
                  <span className="problems-panel__chevron">
                    {isClosed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                  <FileCode size={13} className="problems-panel__file-icon" />
                  <span className="problems-panel__file-name">{basename(path)}</span>
                  {dir && <span className="problems-panel__file-dir">{dir}</span>}
                  <span className="problems-panel__count">{items.length}</span>
                </button>

                {!isClosed && (
                  <div className="problems-panel__group-items">
                    {items.map((problem) => (
                      <button
                        key={problem.id}
                        type="button"
                        className={`problems-panel__row problems-panel__row--${problem.severity}`}
                        onClick={() =>
                          void openFileAt(problem.path, problem.line, problem.column)
                        }
                      >
                        <span className="problems-panel__icon-wrap">
                          {problem.severity === "error" ? (
                            <AlertCircle size={13} className="problems-panel__icon problems-panel__icon--error" />
                          ) : problem.severity === "warning" ? (
                            <AlertTriangle size={13} className="problems-panel__icon problems-panel__icon--warning" />
                          ) : (
                            <Info size={13} className="problems-panel__icon problems-panel__icon--info" />
                          )}
                        </span>
                        <span className="problems-panel__msg">{problem.message}</span>
                        <span className="problems-panel__loc">
                          Ln {problem.line}, Col {problem.column}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
