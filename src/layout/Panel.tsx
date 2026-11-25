export function Panel() {
  return (
    <section className="panel" aria-label="Panel">
      <div className="panel__tabs" role="tablist">
        <button
          type="button"
          className="panel__tab panel__tab--active"
          role="tab"
          aria-selected="true"
        >
          Terminal
        </button>
        <button type="button" className="panel__tab" role="tab" aria-selected="false">
          Problems
        </button>
        <button type="button" className="panel__tab" role="tab" aria-selected="false">
          Output
        </button>
      </div>
      <div className="panel__body">
        Monaco is live in the editor. Terminal host reserved for 0.8.0 (PTY).
      </div>
    </section>
  );
}
