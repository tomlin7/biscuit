import { useMemo, useState } from "react";
import {
  ArrowUp,
  Command,
  Copy,
  Flame,
  History,
  Mic,
  PanelRightClose,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useAi } from "./AiContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useLayout } from "../layout/LayoutContext";
import { IconButton } from "../ui/IconButton";
import { FileIcon } from "../ui/FileIcon";
import "./AiPanel.css";

type Props = {
  onOpenSettings?: () => void;
};

export function AiPanel({ onOpenSettings }: Props) {
  const { messages, settings, busy, error, send, clear } = useAi();
  const { document } = useWorkspace();
  const { toggleAi } = useLayout();
  const [draft, setDraft] = useState("");

  const title = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const t = lastUser.content.trim().replace(/\s+/g, " ");
      return t.length > 42 ? `${t.slice(0, 41)}…` : t;
    }
    return "Agent";
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const withContext =
      document != null
        ? `Regarding file \`${document.path}\`:\n\n${text}`
        : text;
    void send(withContext);
  };

  return (
    <aside className="ai-panel island" aria-label="AI">
      <div className="ai-panel__header">
        <h2 className="ai-panel__title" title={title}>
          {title}
        </h2>
        <div className="ai-panel__actions">
          <IconButton icon={Search} label="Search chat" size={14} disabled />
          <IconButton icon={History} label="History" size={14} onClick={clear} />
          <IconButton icon={Plus} label="New chat" size={14} onClick={clear} />
          <IconButton icon={PanelRightClose} label="Hide AI" size={14} onClick={toggleAi} />
        </div>
      </div>

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
              <div className="ai-panel__bubble-text">{msg.content}</div>
              {msg.role === "user" ? (
                <div className="ai-panel__bubble-meta">
                  <span>
                    {new Date().toLocaleTimeString([], {
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
              ) : null}
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
          <IconButton icon={Plus} label="Attach" size={14} disabled />
          <IconButton icon={Mic} label="Voice" size={14} disabled />
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

      <div className="ai-panel__chips">
        {document ? (
          <span className="ai-panel__chip">
            <FileIcon name={document.title} kind="file" size={12} />
            {document.title}
          </span>
        ) : null}
        <span className="ai-panel__chip">
          <Search size={12} strokeWidth={1.75} aria-hidden />
          Search
        </span>
      </div>

      <div className="ai-panel__footer">
        <button type="button" className="ai-panel__pill" onClick={onOpenSettings}>
          <Settings2 size={12} strokeWidth={1.75} aria-hidden />
          Default
        </button>
        <button type="button" className="ai-panel__pill" onClick={onOpenSettings}>
          <Sparkles size={12} strokeWidth={1.75} aria-hidden />
          {settings.model}
        </button>
        <button type="button" className="ai-panel__pill" title="Effort">
          <Flame size={12} strokeWidth={1.75} aria-hidden />
          High
        </button>
        <IconButton icon={Command} label="Commands" size={13} disabled />
      </div>
    </aside>
  );
}
