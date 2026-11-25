import { useExtensions } from "./ExtensionsContext";
import "./ExtensionsPanel.css";

export function ExtensionsPanel() {
  const { extensions, loading, error, refresh, setEnabled, installSample } =
    useExtensions();

  return (
    <div className="ext-panel">
      <div className="ext-panel__toolbar">
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
        <button type="button" onClick={() => void installSample()}>
          Install sample
        </button>
      </div>
      {loading ? <p className="ext-panel__hint">Loading…</p> : null}
      {error ? <p className="ext-panel__error">{error}</p> : null}
      {extensions.length === 0 && !loading ? (
        <p className="ext-panel__hint">
          No extensions installed. Install the sample pack to contribute a
          command to the palette.
        </p>
      ) : (
        <ul className="ext-panel__list">
          {extensions.map((ext) => (
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
