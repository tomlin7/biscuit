const ACTIVITIES = [
  { id: "explorer", label: "Explorer", glyph: "⧉", active: true },
  { id: "search", label: "Search", glyph: "⌕", active: false },
  { id: "scm", label: "Source Control", glyph: "⑂", active: false },
  { id: "extensions", label: "Extensions", glyph: "▦", active: false },
] as const;

export function ActivityBar() {
  return (
    <nav className="activity-bar" aria-label="Activity">
      {ACTIVITIES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            item.active
              ? "activity-bar__item activity-bar__item--active"
              : "activity-bar__item"
          }
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          title={item.label}
        >
          <span className="activity-bar__glyph" aria-hidden="true">
            {item.glyph}
          </span>
        </button>
      ))}
    </nav>
  );
}
