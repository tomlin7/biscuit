import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function StatusBar() {
  const { document, dirty, cursorLine, cursorColumn, busy, tabs } =
    useWorkspace();

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">T3D 0.7.0</span>
        {tabs.length > 0 ? (
          <span className="status-bar__item">{tabs.length} tabs</span>
        ) : null}
        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
      </div>
      <div className="status-bar__group">
        {document ? (
          <>
            <span className="status-bar__item">
              Ln {cursorLine}, Col {cursorColumn}
            </span>
            <span className="status-bar__item">
              {languageLabel(document.language)}
            </span>
          </>
        ) : null}
      </div>
    </footer>
  );
}
