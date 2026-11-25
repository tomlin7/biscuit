import { useEffect, useState } from "react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  countReplaceInWorkspace,
  hitLabel,
  replaceInWorkspace,
  searchWorkspace,
  type SearchHit,
} from "./workspaceSearch";
import "./SearchPanel.css";

type Props = {
  onOpenHit: (hit: SearchHit) => void;
};

export function SearchPanel({ onOpenHit }: Props) {
  const { rootPath, busy, tabs, applyDiskValue } = useWorkspace();
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(true);
  const [useRegex, setUseRegex] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [replaceNote, setReplaceNote] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!rootPath) {
    return (
      <div className="search-panel search-panel--empty">
        <p className="search-panel__hint">Open a folder to search the workspace.</p>
      </div>
    );
  }

  return (
    <div className="search-panel">
      <input
        className="search-panel__input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search workspace…"
        aria-label="Search workspace"
        autoFocus
        disabled={busy}
      />
      <div className="search-panel__flags">
        <button
          type="button"
          className={matchCase ? "search-panel__flag search-panel__flag--on" : "search-panel__flag"}
          aria-pressed={matchCase}
          onClick={() => setMatchCase((value) => !value)}
          disabled={busy}
        >
          Match case
        </button>
        <button
          type="button"
          className={useRegex ? "search-panel__flag search-panel__flag--on" : "search-panel__flag"}
          aria-pressed={useRegex}
          onClick={() => setUseRegex((value) => !value)}
          disabled={busy}
        >
          Use regex
        </button>
      </div>
      <input
        className="search-panel__input"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="Replace with…"
        aria-label="Replacement text"
        disabled={busy}
      />
      <button
        type="button"
        className="search-panel__replace"
        disabled={busy || !query.trim()}
        onClick={() => {
          if (!rootPath) return;
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
        }}
      >
        Replace all
      </button>
      {replaceNote ? <p className="search-panel__hint">{replaceNote}</p> : null}
      {searching ? <p className="search-panel__hint">Searching…</p> : null}
      {error ? <p className="search-panel__error">{error}</p> : null}
      {!searching && query.trim() && hits.length === 0 ? (
        <p className="search-panel__hint">No results</p>
      ) : null}
      <ul className="search-panel__results">
        {hits.map((hit) => (
          <li key={`${hit.path}:${hit.line}:${hit.column}`}>
            <button
              type="button"
              className="search-panel__hit"
              onClick={() => onOpenHit(hit)}
              title={hit.path}
            >
              <span className="search-panel__hit-file">
                {hitLabel(hit.path)}
                <span className="search-panel__hit-loc">
                  :{hit.line}:{hit.column}
                </span>
              </span>
              <span className="search-panel__hit-preview">{hit.preview}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
