import { MonacoEditor } from "../editor/MonacoEditor";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function EditorArea() {
  const { document, dirty, rootPath } = useWorkspace();
  const hasFile = document.path !== null;
  const tabLabel = hasFile
    ? dirty
      ? `${document.title} •`
      : document.title
    : null;

  return (
    <section className="editor-area island" aria-label="Editors">
      <div className="editor-area__tabs" role="tablist" aria-label="Open editors">
        {tabLabel ? (
          <div
            className="editor-area__tab editor-area__tab--active"
            role="tab"
            aria-selected="true"
          >
            {tabLabel}
          </div>
        ) : (
          <div className="editor-area__tab editor-area__tab--muted">No file</div>
        )}
      </div>
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          <span>{hasFile ? document.path : "Open a file from the explorer"}</span>
        </div>
        {hasFile ? <span>{document.language}</span> : null}
      </div>
      <div className="editor-area__surface">
        {hasFile ? (
          <MonacoEditor />
        ) : (
          <div className="editor-area__empty">
            <h1>T3D</h1>
            <p>
              {rootPath
                ? "Select a text file in the explorer to edit."
                : "Open a folder to start editing."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
