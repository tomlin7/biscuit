import { useState } from "react";
import { Bell, Layers, List } from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { useNotifications } from "../notifications/NotificationsContext";
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
  const { items, unread, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
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
      <div className="status-bar__group status-bar__group--end">
        <IconButton
          icon={List}
          label={errorCount ? `Problems (${errorCount})` : "Problems"}
          size={14}
          onClick={onOpenProblems}
        />
        <IconButton icon={Layers} label="Settings" size={14} onClick={onOpenSettings} />
        <div className="status-bar__notify">
          <IconButton
            icon={Bell}
            label="Notifications"
            size={14}
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
