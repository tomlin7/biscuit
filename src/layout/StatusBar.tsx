import { useEditorSession } from "../editor/EditorSession";

export function StatusBar() {
  const session = useEditorSession();

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <button type="button" className="status-bar__btn" title="Branch">
          main
        </button>
        <span className="status-bar__item">T3D 0.2.1</span>
      </div>
      <div className="status-bar__group">
        <span className="status-bar__item">
          Ln {session.cursorLine}, Col {session.cursorColumn}
        </span>
        <span className="status-bar__item">{session.languageLabel}</span>
        <button type="button" className="status-bar__btn" title="Terminal">
          Terminal
        </button>
      </div>
    </footer>
  );
}
