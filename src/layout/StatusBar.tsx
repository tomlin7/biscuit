import { useEditorSession } from "../editor/EditorSession";

export function StatusBar() {
  const session = useEditorSession();

  return (
    <footer className="status-bar" role="contentinfo">
      <div className="status-bar__group">
        <span className="status-bar__item">main*</span>
        <span className="status-bar__item">T3D 0.2.0</span>
      </div>
      <div className="status-bar__group">
        <span className="status-bar__item">
          Ln {session.cursorLine}, Col {session.cursorColumn}
        </span>
        <span className="status-bar__item">UTF-8</span>
        <span className="status-bar__item">LF</span>
        <span className="status-bar__item">{session.languageLabel}</span>
      </div>
    </footer>
  );
}
