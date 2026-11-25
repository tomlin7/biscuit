import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";

type StatusBarProps = {
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  gitBranch?: string | null;
};

export function StatusBar({
  terminalOpen = false,
  onToggleTerminal,
  gitBranch = null,
}: StatusBarProps) {
  const { document, dirty, cursorLine, cursorColumn, busy, tabs } =
    useWorkspace();

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">T3D 0.9.0</span>
        {gitBranch ? (
          <span className="status-bar__item">{gitBranch}</span>
        ) : null}
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
        {onToggleTerminal ? (
          <button
            type="button"
            className="status-bar__btn"
            onClick={onToggleTerminal}
            title="Ctrl+`"
          >
            {terminalOpen ? "Hide Terminal" : "Terminal"}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
