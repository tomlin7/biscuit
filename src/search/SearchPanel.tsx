import { useEffect, useState } from "react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
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
      void searchWorkspace(rootPath, query)
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
  }, [rootPath, query, revision]);

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
          void replaceInWorkspace(rootPath, query, replacement, dirty)
            .then(async (result) => {
              for (const path of result.paths) {
                if (tabs.some((tab) => tab.path === path)) {
                  applyDiskValue(path, await readTextFile(path));
                }
              }
              const skipped =
                result.skippedDirty > 0
                  ? ` Skipped ${result.skippedDirty} unsaved file${result.skippedDirty === 1 ? "" : "s"}.`
                  : "";
              setReplaceNote(
                `Replaced ${result.replacements} in ${result.files} file${result.files === 1 ? "" : "s"}.${skipped}`,
              );
              setRevision((value) => value + 1);
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
