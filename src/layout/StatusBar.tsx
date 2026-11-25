import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bug,
  Database,
  GitBranch,
  List,
  Terminal,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { useNotifications } from "../notifications/NotificationsContext";
import { useSettings } from "../settings/SettingsContext";
import { editorConfigFor } from "../editor/editorconfig";
import { languageLabel, PICKABLE_LANGUAGES } from "../editor/languages";
import { IconButton } from "../ui/IconButton";

type StatusBarProps = {
  onOpenProblems?: () => void;
  onOpenSettings?: () => void;
  onOpenScm?: () => void;
  onToggleTerminal?: () => void;
  onOpenDebug?: () => void;
  gitBranch?: string | null;
  gitAhead?: number | null;
  gitBehind?: number | null;
  gitDirtyCount?: number;
};

export function StatusBar({
  onOpenProblems,
  onOpenSettings,
  onOpenScm,
  onToggleTerminal,
  onOpenDebug,
  gitBranch = null,
  gitAhead = null,
  gitBehind = null,
  gitDirtyCount = 0,
}: StatusBarProps) {
  const { dirty, busy, rootName, rootPath, document, selectionChars, selectionLines, setEol, setLanguageAt } =
    useWorkspace();
  const { settings, updateEditor } = useSettings();
  const eol = document ? (document.value.includes("\r\n") ? "CRLF" : "LF") : null;
  const { problems } = useDiagnostics();
  const { items, unread, markRead, dismiss, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const [encoding, setEncoding] = useState("UTF-8");
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warnCount = problems.filter((p) => p.severity === "warning").length;

  useEffect(() => {
    if (!document) {
      setEncoding("UTF-8");
      return;
    }
    let cancelled = false;
    void editorConfigFor(document.path, rootPath).then((config) => {
      if (cancelled) return;
      const charset = config.charset?.trim();
      setEncoding(charset ? charset.toUpperCase() : "UTF-8");
    });
    return () => {
      cancelled = true;
    };
  }, [document?.path, rootPath]);

  const cycleTabSize = () => {
    const current = settings.editor.tabSize;
    const next = current === 2 ? 4 : current === 4 ? 8 : 2;
    updateEditor({ tabSize: next });
  };

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <button
          type="button"
          className="status-bar__chip"
          title="Source Control"
          onClick={onOpenScm}
        >
          <GitBranch size={14} strokeWidth={1.75} aria-hidden />
          <span>{gitBranch ?? "—"}</span>
          {gitBranch && (gitAhead != null || gitBehind != null) ? (
            <span className="status-bar__sync" title="Ahead / behind upstream">
              {gitAhead != null && gitAhead > 0 ? `↑${gitAhead}` : null}
              {gitBehind != null && gitBehind > 0 ? `↓${gitBehind}` : null}
              {gitAhead === 0 && gitBehind === 0 ? "✓" : null}
            </span>
          ) : null}
          {gitDirtyCount > 0 ? (
            <span className="status-bar__sync" title="Changed files">
              ●{gitDirtyCount}
            </span>
          ) : null}
        </button>
        {rootName ? (
          <button
            type="button"
            className="status-bar__chip"
            title={rootName}
            onClick={onOpenScm}
          >
            <UserRound size={14} strokeWidth={1.75} aria-hidden />
            <span>{rootName}</span>
          </button>
        ) : null}
        <IconButton
          icon={Terminal}
          label="Terminal"
          size={14}
          onClick={onToggleTerminal}
        />
        <button
          type="button"
          className="status-bar__chip"
          title="Problems"
          onClick={onOpenProblems}
        >
          <AlertCircle size={14} strokeWidth={1.75} aria-hidden />
          {(errorCount > 0 || warnCount > 0) && (
            <>
              <span className="status-bar__err">{errorCount}</span>
              <span className="status-bar__warn">{warnCount}</span>
            </>
          )}
        </button>
        <IconButton
          icon={Bug}
          label="Debug"
          size={14}
          onClick={onOpenDebug}
        />
        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
        {selectionChars > 0 ? (
          <span className="status-bar__item" title="Selection">
            {selectionChars} char{selectionChars === 1 ? "" : "s"}
            {selectionLines > 1 ? ` · ${selectionLines} lines` : ""}
          </span>
        ) : null}
      </div>

      <div className="status-bar__group status-bar__group--end">
        {document && document.language !== "image" ? (
          <label className="status-bar__chip status-bar__lang" title="Language mode">
            <select
              aria-label="Language mode"
              value={
                (PICKABLE_LANGUAGES as readonly string[]).includes(document.language)
                  ? document.language
                  : "plaintext"
              }
              onChange={(event) => setLanguageAt(document.path, event.target.value)}
            >
              {!(PICKABLE_LANGUAGES as readonly string[]).includes(document.language) ? (
                <option value={document.language}>{languageLabel(document.language)}</option>
              ) : null}
              {PICKABLE_LANGUAGES.map((id) => (
                <option key={id} value={id}>
                  {languageLabel(id)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Indentation — click to cycle tab size"
            onClick={cycleTabSize}
          >
            Spaces: {settings.editor.tabSize}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle word wrap"
            onClick={() => updateEditor({ wordWrap: !settings.editor.wordWrap })}
          >
            {settings.editor.wordWrap ? "Wrap" : "No Wrap"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle sticky scroll"
            onClick={() =>
              updateEditor({ stickyScroll: !settings.editor.stickyScroll })
            }
          >
            {settings.editor.stickyScroll ? "Sticky" : "No Sticky"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle minimap"
            onClick={() => updateEditor({ minimap: !settings.editor.minimap })}
          >
            {settings.editor.minimap ? "Minimap" : "No Map"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle line numbers"
            onClick={() =>
              updateEditor({ lineNumbers: !settings.editor.lineNumbers })
            }
          >
            {settings.editor.lineNumbers ? "Ln" : "No Ln"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle render whitespace"
            onClick={() =>
              updateEditor({
                renderWhitespace: !settings.editor.renderWhitespace,
              })
            }
          >
            {settings.editor.renderWhitespace ? "Ws" : "No Ws"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle insert final newline"
            onClick={() =>
              updateEditor({
                insertFinalNewline: !settings.editor.insertFinalNewline,
              })
            }
          >
            {settings.editor.insertFinalNewline ? "Final NL" : "No Final NL"}
          </button>
        ) : null}
        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Toggle trim trailing whitespace"
            onClick={() =>
              updateEditor({
                trimTrailingWhitespace: !settings.editor.trimTrailingWhitespace,
              })
            }
          >
            {settings.editor.trimTrailingWhitespace ? "Trim Ws" : "No Trim"}
          </button>
        ) : null}
        {eol ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Switch end of line"
            onClick={() => setEol(eol === "LF" ? "crlf" : "lf")}
          >
            {eol}
          </button>
        ) : null}
        {document ? (
          <span className="status-bar__item" title="Encoding">
            {encoding}
          </span>
        ) : null}
        <IconButton
          icon={List}
          label="Problems"
          size={14}
          onClick={onOpenProblems}
        />
        <IconButton
          icon={Database}
          label="Settings"
          size={14}
          onClick={onOpenSettings}
        />
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
                      <div className="status-bar__notify-row">
                        <strong>{n.title}</strong>
                        <button
                          type="button"
                          aria-label={`Dismiss ${n.title}`}
                          onClick={() => dismiss(n.id)}
                        >
                          ×
                        </button>
                      </div>
                      {n.detail ? <span>{n.detail}</span> : null}
                      {n.action ? (
                        <button
                          type="button"
                          className="status-bar__notify-action"
                          onClick={() => {
                            n.action?.run();
                            dismiss(n.id);
                          }}
                        >
                          {n.action.label}
                        </button>
                      ) : null}
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
