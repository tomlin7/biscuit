import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Command,
  Copy,
  Download,
  FilePlus,
  Flame,
  Mic,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAi } from "./AiContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useLayout } from "../layout/LayoutContext";
import { IconButton } from "../ui/IconButton";
import { FileIcon } from "../ui/FileIcon";
import { RichMessage } from "./RichMessage";
import "./AiPanel.css";

type Props = {
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
  onOpenPalette?: () => void;
};

export function AiPanel({ onOpenSettings, onOpenSearch, onOpenPalette }: Props) {
  const {
    messages,
    sessions,
    activeSessionId,
    settings,
    busy,
    error,
    attachments,
    showHistory,
    setShowHistory,
    send,
    stop,
    newChat,
    selectSession,
    deleteSession,
    attachFiles,
    removeAttachment,
    attachPath,
    cycleEffort,
    exportSession,
    importSession,
  } = useAi();
  const { document, tabs } = useWorkspace();
  const { toggleAi } = useLayout();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  useEffect(() => {
    if (!document) return;
  }, [document]);

  const title = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const t = lastUser.content.trim().replace(/\s+/g, " ");
      return t.length > 42 ? `${t.slice(0, 41)}…` : t;
    }
    return "Agent";
  }, [messages]);

  const effortLabel =
    settings.effort === "high"
      ? "High"
      : settings.effort === "medium"
        ? "Med"
        : "Low";

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const withActive =
      document != null && !attachments.some((a) => a.path === document.path)
        ? `Regarding file \`${document.path}\`:\n\n${text}`
        : text;
    void send(withActive);
  };

  const startVoice = () => {
    const SR =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).webkitSpeechRecognition;
    if (!SR) {
      window.alert("Speech recognition is not available in this runtime.");
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      if (text) setDraft((d) => (d ? `${d} ${text}` : text));
    };
    rec.start();
  };

  const filteredHistory = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return tabs
      .filter((tab) => !q || tab.title.toLowerCase().includes(q) || tab.path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionQuery, tabs]);

  const applyMention = (tab: { path: string; title: string; value: string }) => {
    attachPath(tab.path, tab.title, tab.value.slice(0, 12000));
    setDraft((current) => {
      const match = current.match(/@([^\s@]*)$/);
      if (!match) return current;
      return `${current.slice(0, current.length - match[0].length)}@${tab.title} `;
    });
    setMentionQuery(null);
    setMentionIndex(0);
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    const match = value.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const showSoftChip =
    document != null && !attachments.some((a) => a.path === document.path);
  const showChips = showSoftChip || attachments.length > 0;

  return (
    <aside className="ai-panel island" aria-label="AI">
      <div className="ai-panel__header">
        <h2 className="ai-panel__title" title={title}>
          {title}
        </h2>
        <div className="ai-panel__actions">
          <IconButton
            icon={Search}
            label="Chat history"
            size={14}
            active={showHistory}
            onClick={() => setShowHistory(!showHistory)}
          />
          <IconButton icon={Plus} label="New chat" size={14} onClick={newChat} />
          <IconButton icon={X} label="Hide AI" size={14} onClick={toggleAi} />
        </div>
      </div>

      {showHistory ? (
        <div className="ai-panel__history">
          {filteredHistory.map((session) => (
            <div key={session.id} className="ai-panel__history-row">
              <button
                type="button"
                className={
                  session.id === activeSessionId
                    ? "ai-panel__history-item ai-panel__history-item--active"
                    : "ai-panel__history-item"
                }
                onClick={() => selectSession(session.id)}
              >
                {session.title || "Untitled"}
              </button>
              <IconButton
                icon={Trash2}
                label="Delete chat"
                size={12}
                onClick={() => deleteSession(session.id)}
              />
            </div>
          ))}
          <div className="ai-panel__history-tools">
            <IconButton
              icon={Download}
              label="Export active chat"
              size={13}
              onClick={exportSession}
            />
            <IconButton
              icon={Upload}
              label="Import chat"
              size={13}
              onClick={() => void importSession()}
            />
          </div>
        </div>
      ) : null}

      <div className="ai-panel__body">
        {messages.length === 0 ? (
          <div className="ai-panel__empty">
            <Sparkles size={18} strokeWidth={1.75} aria-hidden />
            <p>Ask anything about the open workspace.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "ai-panel__bubble ai-panel__bubble--user"
                  : "ai-panel__bubble ai-panel__bubble--assistant"
              }
            >
              {msg.toolCalls && msg.toolCalls.length > 0 ? (
                <details className="ai-panel__tools">
                  <summary>{msg.toolCalls.length} tool calls</summary>
                  <ul>
                    {msg.toolCalls.map((t) => (
                      <li key={t.id}>
                        <code>{t.name}</code>
                        <span>{t.detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <RichMessage text={msg.content} />
              <div className="ai-panel__bubble-meta">
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <IconButton
                  icon={Copy}
                  label="Copy"
                  size={12}
                  onClick={() => void navigator.clipboard.writeText(msg.content)}
                />
              </div>
            </div>
          ))
        )}
        {error ? <p className="ai-panel__error">{error}</p> : null}
      </div>

      <div className="ai-panel__dock">
        {showChips ? (
          <div className="ai-panel__chips">
            {showSoftChip && document ? (
              <button
                type="button"
                className="ai-panel__chip"
                title="Pin active file to context"
                onClick={() =>
                  attachPath(document.path, document.title, document.value)
                }
              >
                <FileIcon name={document.title} kind="file" size={12} />
                <span>{document.title}</span>
              </button>
            ) : null}
            {attachments.map((a) => (
              <span key={a.path} className="ai-panel__chip ai-panel__chip--attached">
                <FileIcon name={a.name} kind="file" size={12} />
                <span>{a.name}</span>
                <button
                  type="button"
                  className="ai-panel__chip-x"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => removeAttachment(a.path)}
                >
                  <X size={10} strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="ai-panel__composer">
          {mentionCandidates.length > 0 ? (
            <div className="ai-panel__mentions" role="listbox">
              {mentionCandidates.map((tab, index) => (
                <button
                  key={tab.path}
                  type="button"
                  role="option"
                  aria-selected={index === mentionIndex}
                  className={
                    index === mentionIndex
                      ? "ai-panel__mention ai-panel__mention--active"
                      : "ai-panel__mention"
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyMention(tab);
                  }}
                >
                  <FileIcon name={tab.title} kind="file" size={12} />
                  <span>{tab.title}</span>
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            className="ai-panel__composer-input"
            rows={3}
            placeholder="Ask anything… (@ files, / commands)"
            value={draft}
            disabled={busy}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (mentionCandidates.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionCandidates.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length,
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const pick = mentionCandidates[mentionIndex] ?? mentionCandidates[0];
                  if (pick) applyMention(pick);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionQuery(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="ai-panel__composer-bar">
            <div className="ai-panel__composer-tools">
              <IconButton
                icon={Plus}
                label="Attach files"
                size={14}
                onClick={() => void attachFiles()}
              />
              <IconButton
                icon={FilePlus}
                label="Attach active file"
                size={14}
                disabled={!document}
                onClick={() => {
                  if (!document) return;
                  attachPath(document.path, document.title, document.value.slice(0, 12000));
                }}
              />
              <IconButton
                icon={Mic}
                label={listening ? "Listening…" : "Voice input"}
                size={14}
                active={listening}
                onClick={startVoice}
              />
            </div>
            <IconButton
              icon={busy ? Square : ArrowUp}
              label={busy ? "Stop" : "Send"}
              size={14}
              disabled={busy ? false : !draft.trim()}
              onClick={busy ? stop : submit}
              className="ai-panel__send"
            />
          </div>
        </div>

        <div className="ai-panel__footer">
          <button type="button" className="ai-panel__pill" onClick={onOpenSearch}>
            <Search size={12} strokeWidth={1.75} aria-hidden />
            Search
          </button>
          <button type="button" className="ai-panel__pill" onClick={onOpenSettings}>
            <Settings2 size={12} strokeWidth={1.75} aria-hidden />
            Default
          </button>
          <button type="button" className="ai-panel__pill" onClick={onOpenSettings}>
            <Sparkles size={12} strokeWidth={1.75} aria-hidden />
            {settings.model}
          </button>
          <button
            type="button"
            className="ai-panel__pill"
            title="Cycle effort"
            onClick={cycleEffort}
          >
            <Flame size={12} strokeWidth={1.75} aria-hidden />
            {effortLabel}
          </button>
          {onOpenPalette ? (
            <IconButton
              icon={Command}
              label="Command palette"
              size={13}
              onClick={onOpenPalette}
            />
          ) : (
            <IconButton
              icon={Command}
              label="Open settings"
              size={13}
              onClick={onOpenSettings}
            />
          )}
          <IconButton
            icon={BookOpen}
            label="Docs / settings"
            size={13}
            onClick={onOpenSettings}
          />
        </div>
      </div>
    </aside>
  );
}

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
