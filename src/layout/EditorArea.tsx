export function EditorArea() {
  return (
    <section className="editor-area" aria-label="Editors">
      <div className="editor-area__tabs" role="tablist" aria-label="Open editors">
        <div
          className="editor-area__tab editor-area__tab--active"
          role="tab"
          aria-selected="true"
        >
          Welcome
        </div>
      </div>
      <div className="editor-area__surface">
        <div className="editor-area__welcome">
          <h1>T3D</h1>
          <p>
            Editor chrome for 0.1.0. Monaco arrives in 0.2.0 — this surface is a
            placeholder until then.
          </p>
        </div>
      </div>
    </section>
  );
}
