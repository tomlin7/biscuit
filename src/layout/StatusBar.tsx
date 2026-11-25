import { Bell, Layers, List } from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { IconButton } from "../ui/IconButton";

type StatusBarProps = {
  onOpenProblems?: () => void;
  onOpenSettings?: () => void;
  gitBranch?: string | null;
};

export function StatusBar({
  onOpenProblems,
  onOpenSettings,
  gitBranch = null,
}: StatusBarProps) {
  const { document, dirty, cursorLine, cursorColumn, busy } = useWorkspace();
  const { problems } = useDiagnostics();
  const errorCount = problems.filter((p) => p.severity === "error").length;

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">T3D 0.11.0</span>
        {gitBranch ? <span className="status-bar__item">{gitBranch}</span> : null}
        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
        {document ? (
          <span className="status-bar__item">
            Ln {cursorLine}, Col {cursorColumn}
          </span>
        ) : null}
      </div>
      <div className="status-bar__group">
        <IconButton
          icon={List}
          label={errorCount ? `Problems (${errorCount})` : "Problems"}
          size={14}
          onClick={onOpenProblems}
        />
        <IconButton icon={Layers} label="Settings" size={14} onClick={onOpenSettings} />
        <IconButton icon={Bell} label="Notifications" size={14} disabled />
      </div>
    </footer>
  );
}
