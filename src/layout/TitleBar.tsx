import { useWorkspace } from "../workspace/WorkspaceContext";

export function TitleBar() {
  const { rootName, openFolder, save, document, dirty, busy } = useWorkspace();

  return (
    <header className="titlebar" role="banner">
      <div className="titlebar__left">
        <span className="titlebar__brand">T3D</span>
        <button
          type="button"
          className="titlebar__text-btn"
          onClick={() => void openFolder()}
          disabled={busy}
        >
          Open Folder
        </button>
        <button
          type="button"
          className="titlebar__text-btn"
          onClick={() => void save()}
          disabled={busy || !document.path || !dirty}
          title="Ctrl+S"
        >
          Save
        </button>
      </div>

      <button
        type="button"
        className="titlebar__project"
        title="Open Folder"
        onClick={() => void openFolder()}
      >
        <span className="titlebar__project-name">
          {rootName ?? "no folder open"}
        </span>
      </button>

      <div className="titlebar__right" />
    </header>
  );
}
