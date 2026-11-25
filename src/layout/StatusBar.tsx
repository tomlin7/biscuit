import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function StatusBar() {
  const { document, dirty, cursorLine, cursorColumn, busy } = useWorkspace();

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">T3D 0.3.0</span>
        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
      </div>
      <div className="status-bar__group">
        {document.path ? (
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
