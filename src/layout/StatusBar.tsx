import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useDiagnostics } from "../lsp/DiagnosticsContext";

type StatusBarProps = {
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  onToggleAi?: () => void;
  aiOpen?: boolean;
  onOpenProblems?: () => void;
  gitBranch?: string | null;
};

export function StatusBar({
  terminalOpen = false,
  onToggleTerminal,
  onToggleAi,
  aiOpen = false,
  onOpenProblems,
  gitBranch = null,
}: StatusBarProps) {
  const { document, dirty, cursorLine, cursorColumn, busy, tabs } =
    useWorkspace();
  const { problems } = useDiagnostics();
  const errorCount = problems.filter((p) => p.severity === "error").length;

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">T3D 0.10.0</span>
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
        {onOpenProblems ? (
          <button
            type="button"
            className="status-bar__btn"
            onClick={onOpenProblems}
            title="Ctrl+Shift+M"
          >
            Problems{errorCount > 0 ? ` ${errorCount}` : ""}
          </button>
        ) : null}
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
        {onToggleAi ? (
          <button
            type="button"
            className="status-bar__btn"
            onClick={onToggleAi}
            title="Ctrl+Shift+A"
          >
            {aiOpen ? "Hide Agent" : "Agent"}
          </button>
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
