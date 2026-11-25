import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Copy,
  Download,
  FilePlus,
  Flame,
  History,
  Mic,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAi } from "./AiContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { listDirectory } from "../workspace/fsTree";
import { basename } from "../workspace/path";
import { useLayout } from "../layout/LayoutContext";
import { IconButton } from "../ui/IconButton";
import { FileIcon } from "../ui/FileIcon";
import { RichMessage } from "./RichMessage";
import "./AiPanel.css";

type MentionItem =
  | { kind: "file"; path: string; title: string; value: string }
  | { kind: "folder"; path: string; title: string };

type Props = {
  onOpenSettings?: () => void;
};

export function AiPanel({ onOpenSettings }: Props) {
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
    regenerate,
    newChat,
    selectSession,
    deleteSession,
    attachFiles,
    removeAttachment,
    clearAttachments,
    attachPath,
    attachImage,
    cycleEffort,
    exportSession,
    importSession,
  } = useAi();
  const { document, tabs, roots, tree, selectionText } = useWorkspace();
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

  const canRegenerate = useMemo(() => {
    return messages.some((m) => m.role === "user") && !busy;
  }, [messages, busy]);

  const filteredHistory = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const mentionCandidates = useMemo((): MentionItem[] => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const folders: MentionItem[] = [];
    const seen = new Set<string>();
    const addFolder = (path: string) => {
      const key = path.replace(/\\/g, "/").toLowerCase();
      if (seen.has(key)) return;
      const title = basename(path);
      if (q && !title.toLowerCase().includes(q) && !path.toLowerCase().includes(q)) return;
      seen.add(key);
      folders.push({ kind: "folder", path, title });
    };
    for (const root of roots) addFolder(root);
    for (const node of tree) {
      if (node.kind === "directory") addFolder(node.path);
    }
    const files: MentionItem[] = tabs
      .filter(
        (tab) =>
          !q ||
          tab.title.toLowerCase().includes(q) ||
          tab.path.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((tab) => ({
        kind: "file" as const,
        path: tab.path,
        title: tab.title,
        value: tab.value,
      }));
    return [...folders.slice(0, 6), ...files].slice(0, 10);
  }, [mentionQuery, tabs, roots, tree]);

  const applyMention = (item: MentionItem) => {
    void (async () => {
      if (item.kind === "file") {
        attachPath(item.path, item.title, item.value.slice(0, 12000));
      } else {
        try {
          const children = await listDirectory(item.path);
          const listing = children
            .slice(0, 80)
            .map((child) => `${child.kind === "directory" ? "dir" : "file"}\t${child.name}`)
            .join("\n");
          attachPath(
            `folder:${item.path}`,
            item.title,
            `Directory listing for ${item.path}:\n${listing || "(empty)"}`,
          );
        } catch (err) {
          attachPath(
            `folder:${item.path}`,
            item.title,
            `Directory ${item.path} (listing failed: ${err instanceof Error ? err.message : String(err)})`,
          );
        }
      }
      setDraft((current) => {
        const match = current.match(/@([^\s@]*)$/);
        if (!match) return current;
        return `${current.slice(0, current.length - match[0].length)}@${item.title} `;
      });
      setMentionQuery(null);
      setMentionIndex(0);
    })();
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
  const selectionKey = document
    ? `selection:${document.path}:${selectionText.slice(0, 48)}`
    : "";
  const showSelectionChip =
    document != null &&
    selectionText.trim().length > 0 &&
    !attachments.some((a) => a.path === selectionKey);
  const showChips = showSoftChip || showSelectionChip || attachments.length > 0;

  return (
    <aside className="ai-panel island" aria-label="AI">
      <div className="ai-panel__header">
        <h2 className="ai-panel__title" title={title}>
          {title}
        </h2>
        <div className="ai-panel__actions">
          <IconButton
            icon={History}
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
                  <summary>
                    {msg.toolCalls.length} tool calls
                    {msg.toolCalls.some((t) => t.ok === false)
                      ? ` · ${msg.toolCalls.filter((t) => t.ok === false).length} failed`
                      : ""}
                  </summary>
                  <ul>
                    {msg.toolCalls.map((t) => (
                      <li key={t.id} className={t.ok === false ? "ai-panel__tool--failed" : undefined}>
                        <code>{t.name}</code>
                        <span>{t.detail}</span>
                        {t.ok === false ? (
                          <button
                            type="button"
                            className="ai-panel__tool-retry"
                            disabled={busy}
                            onClick={() =>
                              void send(
                                `Retry the failed \`${t.name}\` tool call. Previous error: ${t.detail}`,
                              )
                            }
                          >
                            Retry
                          </button>
                        ) : null}
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
            {showSelectionChip && document ? (
              <button
                type="button"
                className="ai-panel__chip"
                title="Pin current selection to context"
                onClick={() =>
                  attachPath(
                    selectionKey,
                    `${document.title} selection`,
                    selectionText.slice(0, 12000),
                  )
                }
              >
                <span>Selection</span>
                <span className="ai-panel__chip-meta">
                  {selectionText.trim().length} chars
                </span>
              </button>
            ) : null}
            {attachments.map((a) => (
              <span key={a.path} className="ai-panel__chip ai-panel__chip--attached">
                {a.kind === "image" ? (
                  <img src={a.content} alt="" className="ai-panel__chip-thumb" />
                ) : (
                  <FileIcon name={a.name} kind="file" size={12} />
                )}
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
            {attachments.length > 0 ? (
              <button
                type="button"
                className="ai-panel__chip ai-panel__chip--clear"
                title="Clear all attachments"
                onClick={clearAttachments}
              >
                Clear all
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="ai-panel__composer">
          {mentionCandidates.length > 0 ? (
            <div className="ai-panel__mentions" role="listbox">
              {mentionCandidates.map((item, index) => (
                <button
                  key={`${item.kind}:${item.path}`}
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
                    applyMention(item);
                  }}
                >
                  <FileIcon
                    name={item.title}
                    kind={item.kind === "folder" ? "directory" : "file"}
                    size={12}
                  />
                  <span>{item.title}</span>
                  {item.kind === "folder" ? (
                    <span className="ai-panel__chip-meta">folder</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            className="ai-panel__composer-input"
            id="ai-composer-input"
            rows={3}
            placeholder="Ask anything… (@ files/folders, / commands)"
            value={draft}
            disabled={busy}
            onChange={(e) => onDraftChange(e.target.value)}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of Array.from(items)) {
                if (!item.type.startsWith("image/")) continue;
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = String(reader.result ?? "");
                  if (!dataUrl.startsWith("data:")) return;
                  attachImage(
                    file.name || `clipboard.${item.type.split("/")[1] || "png"}`,
                    dataUrl,
                    item.type,
                  );
                };
                reader.readAsDataURL(file);
                return;
              }
            }}
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
                icon={RefreshCw}
                label="Regenerate"
                size={14}
                disabled={!canRegenerate}
                onClick={() => void regenerate()}
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
          <button
            type="button"
            className="ai-panel__pill"
            title="Configure model in AI settings"
            onClick={onOpenSettings}
          >
            <Sparkles size={12} strokeWidth={1.75} aria-hidden />
            <span>{settings.model}</span>
          </button>
          <button
            type="button"
            className="ai-panel__pill"
            title="Cycle effort"
            onClick={cycleEffort}
          >
            <Flame size={12} strokeWidth={1.75} aria-hidden />
            <span>{effortLabel}</span>
          </button>
          <IconButton
            icon={Settings2}
            label="AI settings"
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
