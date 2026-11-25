const MENU_ITEMS = ["File", "Edit", "View", "Go", "Terminal", "Help"] as const;

export function Menubar() {
  return (
    <header className="menubar" role="menubar" aria-label="Application">
      <span className="menubar__brand">T3D</span>
      {MENU_ITEMS.map((item) => (
        <button key={item} type="button" className="menubar__item" role="menuitem">
          {item}
        </button>
      ))}
    </header>
  );
}
