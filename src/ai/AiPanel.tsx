import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Command,
  Copy,
  FilePlus,
  Flame,
  Mic,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
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
    newChat,
    selectSession,
    deleteSession,
    attachFiles,
    removeAttachment,
    attachPath,
    cycleEffort,
  } = useAi();
  const { document } = useWorkspace();
  const { toggleAi } = useLayout();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!document) return;
    // Keep active file as a soft context chip via attachments if empty name match
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

      <div className="ai-panel__composer">
        <textarea
          className="ai-panel__composer-input"
          rows={3}
          placeholder="Ask anything… (@ files, / commands)"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="ai-panel__composer-actions">
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
          <IconButton
            icon={ArrowUp}
            label="Send"
            size={14}
            disabled={busy || !draft.trim()}
            onClick={submit}
            className="ai-panel__send"
          />
        </div>
      </div>

      {(document && !attachments.some((a) => a.path === document.path)) ||
      attachments.length > 0 ? (
      <div className="ai-panel__chips">
        {document && !attachments.some((a) => a.path === document.path) ? (
          <button
            type="button"
            className="ai-panel__chip"
            title="Pin active file to context"
            onClick={() =>
              attachPath(document.path, document.title, document.value)
            }
          >
            <FileIcon name={document.title} kind="file" size={12} />
            {document.title}
          </button>
        ) : null}
        {attachments.map((a) => (
          <span key={a.path} className="ai-panel__chip ai-panel__chip--attached">
            <FileIcon name={a.name} kind="file" size={12} />
            {a.name}
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
