import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  countReplaceInWorkspace,
  hitLabel,
  replaceInWorkspace,
  searchWorkspace,
  type SearchHit,
} from "./workspaceSearch";
import { IconButton } from "../ui/IconButton";
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode,
  Regex,
  RefreshCw,
  ReplaceAll,
} from "lucide-react";
import "./SearchPanel.css";

type Props = {
  onOpenHit: (hit: SearchHit) => void;
};

function getRelativeDir(fullPath: string, root: string): string {
  const normFull = fullPath.replace(/\\/g, "/");
  const normRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  if (normFull.startsWith(normRoot)) {
    const rel = normFull.slice(normRoot.length).replace(/^\//, "");
    const parts = rel.split("/");
    parts.pop();
    return parts.join("/") || "./";
  }
  const parts = normFull.split("/");
  parts.pop();
  return parts.join("/") || "./";
}

export function SearchPanel({ onOpenHit }: Props) {
  const { rootPath, busy, tabs, applyDiskValue } = useWorkspace();
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(true);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [replaceNote, setReplaceNote] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rootPath || !query.trim()) {
      setHits([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      void searchWorkspace(rootPath, query, { matchCase, useRegex })
        .then((results) => {
          if (!cancelled) setHits(results);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : String(err));
            setHits([]);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rootPath, query, matchCase, useRegex, revision]);

  const groupedHits = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.path);
      if (list) list.push(hit);
      else map.set(hit.path, [hit]);
    }
    return Array.from(map.entries()).map(([path, fileHits]) => ({
      path,
      filename: hitLabel(path),
      directory: getRelativeDir(path, rootPath || ""),
      hits: fileHits,
    }));
  }, [hits, rootPath]);

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAllCollapse = () => {
    if (collapsedFiles.size === groupedHits.length) {
      setCollapsedFiles(new Set());
    } else {
      setCollapsedFiles(new Set(groupedHits.map((g) => g.path)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setMatchCase((v) => !v);
    } else if (e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      setUseRegex((v) => !v);
    }
  };

  const handleReplaceAll = () => {
    if (!rootPath || !query.trim()) return;
    const dirty = new Set(
      tabs.filter((tab) => tab.value !== tab.baseline).map((tab) => tab.path),
    );
    setReplaceNote(null);
    void countReplaceInWorkspace(rootPath, query, replacement, dirty, { matchCase, useRegex })
      .then((preview) => {
        if (preview.replacements === 0) {
          setReplaceNote("No matches to replace.");
          return;
        }
        const skipped =
          preview.skippedDirty > 0
            ? ` ${preview.skippedDirty} unsaved file${preview.skippedDirty === 1 ? "" : "s"} will be skipped.`
            : "";
        const ok = window.confirm(
          `Replace ${preview.replacements} match${preview.replacements === 1 ? "" : "es"} in ${preview.files} file${preview.files === 1 ? "" : "s"}?${skipped}`,
        );
        if (!ok) {
          setReplaceNote("Replace cancelled.");
          return;
        }
        return replaceInWorkspace(rootPath, query, replacement, dirty, { matchCase, useRegex }).then(
          async (result) => {
            for (const path of result.paths) {
              if (tabs.some((tab) => tab.path === path)) {
                applyDiskValue(path, await readTextFile(path));
              }
            }
            const skippedNote =
              result.skippedDirty > 0
                ? ` Skipped ${result.skippedDirty} unsaved file${result.skippedDirty === 1 ? "" : "s"}.`
                : "";
            setReplaceNote(
              `Replaced ${result.replacements} in ${result.files} file${result.files === 1 ? "" : "s"}.${skippedNote}`,
            );
            setRevision((value) => value + 1);
          },
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  };

  if (!rootPath) {
    return (
      <div className="search-panel search-panel--empty">
        <p className="search-panel__hint">Open a folder to search the workspace.</p>
      </div>
    );
  }

  const allCollapsed = groupedHits.length > 0 && collapsedFiles.size === groupedHits.length;

  return (
    <div className="search-panel" onKeyDown={handleKeyDown}>
      <div className="search-panel__inputs">
        <div className="search-panel__row">
          <button
            type="button"
            className="search-panel__toggle-replace-btn"
            onClick={() => setShowReplace((v) => !v)}
            title={showReplace ? "Hide Replace" : "Show Replace"}
            aria-label="Toggle Replace"
          >
            {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <div className="search-panel__input-wrap">
            <input
              className="search-panel__input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (Alt+C case, Alt+R regex)"
              aria-label="Search workspace"
              autoFocus
              disabled={busy}
            />
            <div className="search-panel__input-actions">
              <button
                type="button"
                className={`search-panel__action-btn ${matchCase ? "search-panel__action-btn--active" : ""}`}
                onClick={() => setMatchCase((v) => !v)}
                title="Match Case (Alt+C)"
                aria-pressed={matchCase}
              >
                <CaseSensitive size={14} />
              </button>
              <button
                type="button"
                className={`search-panel__action-btn ${useRegex ? "search-panel__action-btn--active" : ""}`}
                onClick={() => setUseRegex((v) => !v)}
                title="Use Regular Expression (Alt+R)"
                aria-pressed={useRegex}
              >
                <Regex size={14} />
              </button>
            </div>
          </div>
        </div>

        {showReplace && (
          <div className="search-panel__row search-panel__row--replace">
            <div className="search-panel__toggle-spacer" />
            <div className="search-panel__input-wrap">
              <input
                className="search-panel__input"
                type="text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replace"
                aria-label="Replacement text"
                disabled={busy}
              />
              <div className="search-panel__input-actions">
                <button
                  type="button"
                  className="search-panel__action-btn search-panel__action-btn--primary"
                  onClick={handleReplaceAll}
                  disabled={busy || !query.trim()}
                  title="Replace All"
                  aria-label="Replace All"
                >
                  <ReplaceAll size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {replaceNote && <p className="search-panel__hint">{replaceNote}</p>}
      {error && <p className="search-panel__error">{error}</p>}

      {query.trim() && (
        <div className="search-panel__header">
          <span className="search-panel__count">
            {searching
              ? "Searching…"
              : `${hits.length} result${hits.length === 1 ? "" : "s"} in ${groupedHits.length} file${groupedHits.length === 1 ? "" : "s"}`}
          </span>
          <div className="search-panel__header-actions">
            <IconButton
              icon={RefreshCw}
              label="Refresh search"
              size={13}
              onClick={() => setRevision((v) => v + 1)}
            />
            {groupedHits.length > 0 && (
              <IconButton
                icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp}
                label={allCollapsed ? "Expand all files" : "Collapse all files"}
                size={13}
                onClick={toggleAllCollapse}
              />
            )}
          </div>
        </div>
      )}

      {!searching && query.trim() && hits.length === 0 && !error && (
        <p className="search-panel__hint search-panel__hint--empty">No results found.</p>
      )}

      <div className="search-panel__tree" role="tree">
        {groupedHits.map((group) => {
          const isCollapsed = collapsedFiles.has(group.path);
          return (
            <div key={group.path} className="search-panel__file-group">
              <button
                type="button"
                className="search-panel__file-header"
                onClick={() => toggleFileCollapse(group.path)}
                title={group.path}
              >
                <span className="search-panel__file-toggle">
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </span>
                <FileCode size={13} className="search-panel__file-icon" />
                <span className="search-panel__file-name">{group.filename}</span>
                <span className="search-panel__file-dir">{group.directory}</span>
                <span className="search-panel__file-badge">{group.hits.length}</span>
              </button>

              {!isCollapsed && (
                <div className="search-panel__file-matches">
                  {group.hits.map((hit) => (
                    <button
                      key={`${hit.path}:${hit.line}:${hit.column}`}
                      type="button"
                      className="search-panel__match-row"
                      onClick={() => onOpenHit(hit)}
                      title={`${group.filename}:${hit.line}:${hit.column}`}
                    >
                      <span className="search-panel__match-line">{hit.line}</span>
                      <span className="search-panel__match-preview">{hit.preview}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
