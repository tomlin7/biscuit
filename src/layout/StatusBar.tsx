import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bug,
  Folder,
  GitBranch,
  Settings,
  SlidersHorizontal,
  Terminal,
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
  const {
    dirty,
    busy,
    rootName,
    rootPath,
    document,
    cursorLine,
    cursorColumn,
    selectionChars,
    selectionLines,
    setEol,
    setLanguageAt,
  } = useWorkspace();
  const { settings, updateEditor } = useSettings();
  const eol = document ? (document.value.includes("\r\n") ? "CRLF" : "LF") : null;
  const { problems } = useDiagnostics();
  const { items, unread, markRead, dismiss, clear } = useNotifications();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [encoding, setEncoding] = useState("UTF-8");
  const configMenuRef = useRef<HTMLDivElement>(null);
  const notifyMenuRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener for popovers
  useEffect(() => {
    if (!configOpen && !notifyOpen) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (configOpen && configMenuRef.current && !configMenuRef.current.contains(target)) {
        setConfigOpen(false);
      }
      if (notifyOpen && notifyMenuRef.current && !notifyMenuRef.current.contains(target)) {
        setNotifyOpen(false);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [configOpen, notifyOpen]);

  const cycleTabSize = () => {
    const current = settings.editor.tabSize;
    const next = current === 2 ? 4 : current === 4 ? 8 : 2;
    updateEditor({ tabSize: next });
  };

  return (
    <footer className="status-bar" role="contentinfo">
      {/* Left group: Git status, Project root, Terminal, Problems, Debug */}
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
            title={`Workspace folder: ${rootName}`}
            onClick={onOpenScm}
          >
            <Folder size={14} strokeWidth={1.75} aria-hidden />
            <span>{rootName}</span>
          </button>
        ) : null}

        <IconButton
          icon={Terminal}
          label="Toggle Terminal"
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
          {errorCount > 0 || warnCount > 0 ? (
            <>
              {errorCount > 0 ? <span className="status-bar__err">{errorCount}</span> : null}
              {warnCount > 0 ? <span className="status-bar__warn">{warnCount}</span> : null}
            </>
          ) : (
            <span>0</span>
          )}
        </button>

        <IconButton
          icon={Bug}
          label="Debug Panel"
          size={14}
          onClick={onOpenDebug}
        />

        {busy ? <span className="status-bar__item">Working…</span> : null}
        {dirty ? <span className="status-bar__item">Unsaved</span> : null}
      </div>

      {/* Right group: Cursor pos, Indent, Encoding, EOL, Language, Quick Config, Settings, Notifications */}
      <div className="status-bar__group status-bar__group--end">
        {document && document.language !== "image" ? (
          <span className="status-bar__item" title="Line and Column">
            Ln {cursorLine}, Col {cursorColumn}
            {selectionChars > 0 ? (
              <span className="status-bar__selection">
                {" "}
                ({selectionChars} {selectionChars === 1 ? "char" : "chars"}
                {selectionLines > 1 ? `, ${selectionLines} lines` : ""})
              </span>
            ) : null}
          </span>
        ) : null}

        {document && document.language !== "image" ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Indentation (click to cycle: 2, 4, 8 spaces)"
            onClick={cycleTabSize}
          >
            Spaces: {settings.editor.tabSize}
          </button>
        ) : null}

        {document ? (
          <span className="status-bar__item" title="File Encoding">
            {encoding}
          </span>
        ) : null}

        {eol ? (
          <button
            type="button"
            className="status-bar__chip"
            title="Switch End of Line sequence (LF / CRLF)"
            onClick={() => setEol(eol === "LF" ? "crlf" : "lf")}
          >
            {eol}
          </button>
        ) : null}

        {document && document.language !== "image" ? (
          <label className="status-bar__chip status-bar__lang" title="Select Language Mode">
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

        {/* Quick Editor Config Popover Toggle */}
        <div className="status-bar__notify" ref={configMenuRef}>
          <IconButton
            icon={SlidersHorizontal}
            label="Editor Quick Settings"
            size={14}
            active={configOpen}
            onClick={() => setConfigOpen((v) => !v)}
          />
          {configOpen ? (
            <div className="status-bar__popover status-bar__popover--config island">
              <div className="status-bar__popover-head">
                <span>Editor Quick Config</span>
                <button type="button" onClick={() => setConfigOpen(false)}>
                  Close
                </button>
              </div>
              <div className="status-bar__config-list">
                <label className="status-bar__config-row">
                  <span>Word Wrap</span>
                  <input
                    type="checkbox"
                    checked={settings.editor.wordWrap}
                    onChange={(e) => updateEditor({ wordWrap: e.target.checked })}
                  />
                </label>
                <label className="status-bar__config-row">
                  <span>Minimap</span>
                  <input
                    type="checkbox"
                    checked={settings.editor.minimap}
                    onChange={(e) => updateEditor({ minimap: e.target.checked })}
                  />
                </label>
                <label className="status-bar__config-row">
                  <span>Sticky Scroll</span>
                  <input
                    type="checkbox"
                    checked={settings.editor.stickyScroll}
                    onChange={(e) => updateEditor({ stickyScroll: e.target.checked })}
                  />
                </label>
                <label className="status-bar__config-row">
                  <span>Line Numbers</span>
                  <select
                    value={
                      !settings.editor.lineNumbers
                        ? "off"
                        : settings.editor.relativeLineNumbers
                          ? "relative"
                          : "on"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "off") {
                        updateEditor({ lineNumbers: false, relativeLineNumbers: false });
                      } else if (val === "relative") {
                        updateEditor({ lineNumbers: true, relativeLineNumbers: true });
                      } else {
                        updateEditor({ lineNumbers: true, relativeLineNumbers: false });
                      }
                    }}
                  >
                    <option value="on">Normal</option>
                    <option value="relative">Relative</option>
                    <option value="off">Off</option>
                  </select>
                </label>
                <label className="status-bar__config-row">
                  <span>Render Whitespace</span>
                  <input
                    type="checkbox"
                    checked={settings.editor.renderWhitespace}
                    onChange={(e) => updateEditor({ renderWhitespace: e.target.checked })}
                  />
                </label>
                <label className="status-bar__config-row">
                  <span>Font Size</span>
                  <select
                    value={settings.editor.fontSize}
                    onChange={(e) => updateEditor({ fontSize: Number(e.target.value) })}
                  >
                    {[12, 13, 14, 15, 16, 18, 20].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}px
                      </option>
                    ))}
                  </select>
                </label>
                <label className="status-bar__config-row">
                  <span>Auto Save</span>
                  <select
                    value={settings.editor.autoSaveMs}
                    onChange={(e) => updateEditor({ autoSaveMs: Number(e.target.value) })}
                  >
                    <option value={0}>Off</option>
                    <option value={1000}>After 1s</option>
                    <option value={2000}>After 2s</option>
                    <option value={5000}>After 5s</option>
                  </select>
                </label>
                <label className="status-bar__config-row">
                  <span>Cursor Style</span>
                  <select
                    value={settings.editor.cursorStyle}
                    onChange={(e) =>
                      updateEditor({
                        cursorStyle: e.target.value as "line" | "block" | "underline",
                      })
                    }
                  >
                    <option value="line">Line</option>
                    <option value="block">Block</option>
                    <option value="underline">Underline</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {/* Global Settings Dialog Trigger */}
        <IconButton
          icon={Settings}
          label="Open Settings"
          size={14}
          onClick={onOpenSettings}
        />

        {/* Notifications Popover */}
        <div className="status-bar__notify" ref={notifyMenuRef}>
          <IconButton
            icon={Bell}
            label="Notifications"
            size={14}
            active={notifyOpen}
            onClick={() => {
              setNotifyOpen((v) => !v);
              markRead();
            }}
          />
          {unread > 0 ? <span className="status-bar__dot" /> : null}
          {notifyOpen ? (
            <div className="status-bar__popover island">
              <div className="status-bar__popover-head">
                <span>Notifications</span>
                {items.length > 0 ? (
                  <button type="button" onClick={clear}>
                    Clear all
                  </button>
                ) : null}
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
