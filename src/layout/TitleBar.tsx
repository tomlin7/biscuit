const LEFT_ACTIONS = [
  { id: "files", label: "Explorer", glyph: "⧉" },
  { id: "search", label: "Search", glyph: "⌕" },
  { id: "git", label: "Source Control", glyph: "⑂" },
] as const;

const RIGHT_ACTIONS = [
  { id: "run", label: "Run", glyph: "▷" },
  { id: "ai", label: "AI", glyph: "✦" },
] as const;

export function TitleBar() {
  return (
    <header className="titlebar" role="banner">
      <div className="titlebar__left">
        <span className="titlebar__brand">T3D</span>
        {LEFT_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="titlebar__icon-btn"
            title={action.label}
            aria-label={action.label}
          >
            {action.glyph}
          </button>
        ))}
      </div>

      <button type="button" className="titlebar__project" title="Workspace">
        <span className="titlebar__project-name">no folder open</span>
        <span className="titlebar__project-plus" aria-hidden="true">
          +
        </span>
      </button>

      <div className="titlebar__right">
        {RIGHT_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="titlebar__icon-btn"
            title={action.label}
            aria-label={action.label}
          >
            {action.glyph}
          </button>
        ))}
      </div>
    </header>
  );
}
