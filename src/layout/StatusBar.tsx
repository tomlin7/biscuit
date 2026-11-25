import { useState } from "react";
import {
  AlertCircle,
  Bell,
  GitBranch,
  Layers,
  List,
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { useNotifications } from "../notifications/NotificationsContext";
import { IconButton } from "../ui/IconButton";

type StatusBarProps = {
  onOpenProblems?: () => void;
  onOpenSettings?: () => void;
  onOpenScm?: () => void;
  gitBranch?: string | null;
};

export function StatusBar({
  onOpenProblems,
  onOpenSettings,
  onOpenScm,
  gitBranch = null,
}: StatusBarProps) {
  const { document, dirty, cursorLine, cursorColumn, busy, rootName } =
    useWorkspace();
  const { problems } = useDiagnostics();
  const { items, unread, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warnCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        {gitBranch ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Source Control"
            onClick={onOpenScm}
          >
            <GitBranch size={15} strokeWidth={1.75} aria-hidden />
            <span>{gitBranch}</span>
          </button>
        ) : null}
        {rootName ? (
          <span className="status-bar__item">{rootName}</span>
        ) : null}
        <button
          type="button"
          className="status-bar__chip"
          title="Problems"
          onClick={onOpenProblems}
        >
          <AlertCircle size={15} strokeWidth={1.75} aria-hidden />
          <span className="status-bar__err">{errorCount}</span>
          <span className="status-bar__warn">{warnCount}</span>
        </button>
        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
        {document ? (
          <span className="status-bar__item">
            Ln {cursorLine}, Col {cursorColumn}
          </span>
        ) : null}
      </div>
      <div className="status-bar__group status-bar__group--end">
        <span className="status-bar__item status-bar__version">T3D 0.11.0</span>
        <IconButton
          icon={List}
          label={errorCount ? `Problems (${errorCount})` : "Problems"}
          size={16}
          onClick={onOpenProblems}
        />
        <IconButton
          icon={Layers}
          label="Settings"
          size={16}
          onClick={onOpenSettings}
        />
        <div className="status-bar__notify">
          <IconButton
            icon={Bell}
            label="Notifications"
            size={16}
            active={open}
            onClick={() => {
              setOpen((v) => !v);
              markRead();
            }}
          />
          {unread > 0 ? <span className="status-bar__dot" /> : null}
          {open ? (
            <div className="status-bar__popover island">
              <div className="status-bar__popover-head">
                <span>Notifications</span>
                <button type="button" onClick={clear}>
                  Clear
                </button>
              </div>
              {items.length === 0 ? (
                <p className="status-bar__popover-empty">No notifications</p>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li key={n.id}>
                      <strong>{n.title}</strong>
                      {n.detail ? <span>{n.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
