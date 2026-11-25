import { useMemo, useState } from "react";
import {
  Blocks,
  FolderDown,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useExtensions } from "./ExtensionsContext";
import { IconButton } from "../ui/IconButton";
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
  const [enabledOnly, setEnabledOnly] = useState(false);

  const enabledCount = useMemo(
    () => extensions.filter((e) => e.enabled).length,
    [extensions],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return extensions.filter((ext) => {
      if (enabledOnly && !ext.enabled) return false;
      if (!needle) return true;
      return (
        ext.name.toLowerCase().includes(needle) ||
        ext.id.toLowerCase().includes(needle) ||
        (ext.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [extensions, query, enabledOnly]);

  return (
    <div className="ext-panel">
      <div className="ext-panel__toolbar">
        <span className="ext-panel__title">Extensions</span>
        <span className="ext-panel__badge">{extensions.length}</span>
        <div className="ext-panel__actions">
          <IconButton
            icon={RefreshCw}
            label="Refresh extensions"
            size={13}
            onClick={() => void refresh()}
          />
          <IconButton
            icon={FolderDown}
            label="Install from folder"
            size={13}
            onClick={() => void installFromFolder()}
          />
          <IconButton
            icon={Plus}
            label="Create new extension"
            size={13}
            onClick={() => void scaffoldInFolder()}
          />
          <IconButton
            icon={Sparkles}
            label="Install sample extension"
            size={13}
            onClick={() => void installSample()}
          />
        </div>
      </div>

      <div className="ext-panel__search-bar">
        <div className="ext-panel__search-wrap">
          <Search size={13} className="ext-panel__search-icon" aria-hidden />
          <input
            className="ext-panel__search"
            value={query}
            placeholder="Search extensions…"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search extensions"
          />
          {query && (
            <button
              type="button"
              className="ext-panel__search-clear"
              onClick={() => setQuery("")}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`ext-panel__chip ${enabledOnly ? "ext-panel__chip--active" : ""}`}
          aria-pressed={enabledOnly}
          onClick={() => setEnabledOnly((value) => !value)}
        >
          Enabled ({enabledCount})
        </button>
      </div>

      <div className="ext-panel__body">
        {loading && <p className="ext-panel__hint">Loading extensions…</p>}
        {error && <p className="ext-panel__error">{error}</p>}
        {extensions.length === 0 && !loading ? (
          <div className="ext-panel__empty">
            <Blocks size={32} className="ext-panel__empty-icon" />
            <p className="ext-panel__hint">
              No extensions installed. Install an extension from a folder or install the sample.
            </p>
            <button
              type="button"
              className="ext-panel__cta-btn"
              onClick={() => void installSample()}
            >
              Install Sample Extension
            </button>
          </div>
        ) : shown.length === 0 ? (
          <p className="ext-panel__hint">No extensions match &ldquo;{query}&rdquo;.</p>
        ) : (
          <ul className="ext-panel__list">
            {shown.map((ext) => (
              <li key={ext.id} className="ext-panel__card">
                <div className="ext-panel__card-top">
                  <div className="ext-panel__icon-box">
                    <Blocks size={16} className="ext-panel__icon" />
                  </div>
                  <div className="ext-panel__meta">
                    <div className="ext-panel__name-row">
                      <strong className="ext-panel__name">{ext.name}</strong>
                      <span className="ext-panel__version">v{ext.version}</span>
                    </div>
                    <span className="ext-panel__id">{ext.id}</span>
                  </div>
                </div>

                <p className="ext-panel__desc">
                  {ext.description || "No description provided."}
                </p>

                <div className="ext-panel__card-footer">
                  <label className="ext-panel__toggle">
                    <input
                      type="checkbox"
                      checked={ext.enabled}
                      onChange={(e) => void setEnabled(ext.id, e.target.checked)}
                    />
                    <span className="ext-panel__toggle-label">
                      {ext.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
