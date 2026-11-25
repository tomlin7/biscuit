export function Sidebar() {
  return (
    <aside className="sidebar island" aria-label="Explorer">
      <div className="sidebar__search">
        <span aria-hidden="true">⌕</span>
        <input
          className="sidebar__search-input"
          type="search"
          placeholder="Search"
          aria-label="Search files"
          disabled
        />
      </div>
      <div className="sidebar__body">
        <div className="sidebar__placeholder-row">src</div>
        <div className="sidebar__placeholder-row sidebar__placeholder-row--active">
          untitled-1.ts
        </div>
        <p className="sidebar__hint">
          Island chrome matches Biscuit. Real folder tree arrives in 0.3.0.
        </p>
      </div>
    </aside>
  );
}
