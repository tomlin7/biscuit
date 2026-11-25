import { useMemo, useState } from "react";
import { useExtensions } from "./ExtensionsContext";
import "./ExtensionsPanel.css";

export function ExtensionsPanel() {
  const {
    extensions,
    loading,
    error,
    refresh,
    setEnabled,
    installSample,
    installFromFolder,
    scaffoldInFolder,
  } = useExtensions();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return extensions;
    return extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(needle) ||
        ext.id.toLowerCase().includes(needle),
    );
  }, [extensions, query]);

  return (
    <div className="ext-panel">
      <div className="ext-panel__toolbar">
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
        <button type="button" onClick={() => void installFromFolder()}>
          Install folder
        </button>
        <button type="button" onClick={() => void scaffoldInFolder()}>
          New extension
        </button>
        <button type="button" onClick={() => void installSample()}>
          Install sample
        </button>
      </div>
      <input
        className="ext-panel__search"
        value={query}
        placeholder="Search installed extensions"
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading ? <p className="ext-panel__hint">Loading…</p> : null}
      {error ? <p className="ext-panel__error">{error}</p> : null}
      {extensions.length === 0 && !loading ? (
        <p className="ext-panel__hint">
          No extensions installed. Install a folder that contains
          extension.json, or start a new one.
        </p>
      ) : shown.length === 0 ? (
        <p className="ext-panel__hint">No extensions match that name.</p>
      ) : (
        <ul className="ext-panel__list">
          {shown.map((ext) => (
            <li key={ext.id} className="ext-panel__card">
              <div className="ext-panel__meta">
                <strong>{ext.name}</strong>
                <span>
                  {ext.id} · v{ext.version}
                </span>
                <p>{ext.description || "No description"}</p>
              </div>
              <label className="ext-panel__toggle">
                <input
                  type="checkbox"
                  checked={ext.enabled}
                  onChange={(e) => void setEnabled(ext.id, e.target.checked)}
                />
                Enabled
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
