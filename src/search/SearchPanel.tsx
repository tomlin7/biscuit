import { useEffect, useState } from "react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { hitLabel, searchWorkspace, type SearchHit } from "./workspaceSearch";
import "./SearchPanel.css";

type Props = {
  onOpenHit: (hit: SearchHit) => void;
};

export function SearchPanel({ onOpenHit }: Props) {
  const { rootPath, busy } = useWorkspace();
  const [query, setQuery] = useState("");
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
  }, [rootPath, query]);

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
