export function AiPanel() {
  return (
    <aside className="ai-panel island" aria-label="AI">
      <div className="ai-panel__header">
        <h2 className="ai-panel__title">Ask anything</h2>
        <div className="ai-panel__actions">
          <button type="button" className="ai-panel__icon-btn" title="New chat" aria-label="New chat">
            +
          </button>
        </div>
      </div>

      <div className="ai-panel__body">
        <div className="ai-panel__bubble">How should T3D evolve from here?</div>
        <p className="ai-panel__reply">
          AI chat is a layout island for now. Agents and models land in a later
          0.x milestone — Monaco and workspace FS come first.
        </p>
      </div>

      <div className="ai-panel__composer">
        <textarea
          className="ai-panel__composer-input"
          rows={2}
          placeholder="Ask anything…"
          disabled
          aria-label="Ask anything"
        />
        <div className="ai-panel__composer-row">
          <span className="ai-panel__chip">Default</span>
          <div className="ai-panel__composer-tools">
            <button type="button" className="ai-panel__icon-btn" disabled aria-label="Attach">
              +
            </button>
            <button type="button" className="ai-panel__icon-btn" disabled aria-label="Send">
              ↑
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
