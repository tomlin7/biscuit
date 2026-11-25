import { useState } from "react";
import { useAi } from "./AiContext";
import "./AiPanel.css";

export function AiPanel() {
  const { messages, settings, busy, error, send, clear, setSettings } = useAi();
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  return (
    <aside className="ai-panel island" aria-label="AI">
      <div className="ai-panel__header">
        <h2 className="ai-panel__title">Agent</h2>
        <div className="ai-panel__actions">
          <button
            type="button"
            className="ai-panel__icon-btn"
            title="Settings"
            onClick={() => setShowSettings((v) => !v)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="ai-panel__icon-btn"
            title="Clear"
            onClick={clear}
          >
            ⌫
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="ai-panel__settings">
          <label>
            Base URL
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ baseUrl: e.target.value })}
            />
          </label>
          <label>
            API key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value })}
              placeholder="sk-…"
            />
          </label>
          <label>
            Model
            <input
              value={settings.model}
              onChange={(e) => setSettings({ model: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      <div className="ai-panel__body">
        {messages.length === 0 ? (
          <p className="ai-panel__hint">
            Ask the coding agent anything. Configure an OpenAI-compatible endpoint
            in settings to enable live replies.
          </p>
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
              {msg.content}
            </div>
          ))
        )}
        {error ? <p className="ai-panel__error">{error}</p> : null}
      </div>

      <div className="ai-panel__composer">
        <textarea
          className="ai-panel__composer-input"
          rows={3}
          placeholder="Ask anything…"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = draft;
              setDraft("");
              void send(text);
            }
          }}
        />
        <div className="ai-panel__composer-row">
          <span className="ai-panel__chip">{settings.model}</span>
          <button
            type="button"
            className="ai-panel__send"
            disabled={busy || !draft.trim()}
            onClick={() => {
              const text = draft;
              setDraft("");
              void send(text);
            }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </aside>
  );
}
