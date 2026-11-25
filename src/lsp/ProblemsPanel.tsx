import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { basename } from "../workspace/path";
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

export function ProblemsPanel() {
  const { problems } = useDiagnostics();
  const { openFileAt } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(() => loadFilter());

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, severityFilter);
    } catch {
      /* ignore */
    }
  }, [severityFilter]);

  const filtered = useMemo(() => {
    if (severityFilter === "all") return problems;
    return problems.filter((problem) => problem.severity === severityFilter);
  }, [problems, severityFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const problem of filtered) {
      const list = map.get(problem.path) ?? [];
      list.push(problem);
      map.set(problem.path, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="problems-panel">
      <div className="problems-panel__filters" role="toolbar" aria-label="Filter by severity">
        {(
          [
            ["all", "All"],
            ["error", "Errors"],
            ["warning", "Warnings"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              severityFilter === value
                ? "problems-panel__filter problems-panel__filter--active"
                : "problems-panel__filter"
            }
            aria-pressed={severityFilter === value}
            onClick={() => setSeverityFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="problems-panel__empty">
          {problems.length === 0 ? "No problems detected." : "No matching problems."}
        </p>
      ) : (
        <ul className="problems-panel__list">
          {groups.map(([path, items]) => {
            const open = !collapsed.has(path);
            return (
              <li key={path} className="problems-panel__group">
                <button
                  type="button"
                  className="problems-panel__file"
                  onClick={() => toggle(path)}
                  aria-expanded={open}
                >
                  <ChevronRight
                    size={12}
                    strokeWidth={2}
                    className={
                      open
                        ? "problems-panel__chevron problems-panel__chevron--open"
                        : "problems-panel__chevron"
                    }
                    aria-hidden
                  />
                  <span className="problems-panel__file-name">{basename(path)}</span>
                  <span className="problems-panel__count">{items.length}</span>
                </button>
                {open
                  ? items.map((problem) => (
                      <button
                        key={problem.id}
                        type="button"
                        className={`problems-panel__row problems-panel__row--${problem.severity}`}
                        onClick={() =>
                          void openFileAt(problem.path, problem.line, problem.column)
                        }
                      >
                        <span className="problems-panel__sev">{problem.severity}</span>
                        <span className="problems-panel__msg">{problem.message}</span>
                        <span className="problems-panel__loc">
                          :{problem.line}:{problem.column}
                        </span>
                      </button>
                    ))
                  : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
