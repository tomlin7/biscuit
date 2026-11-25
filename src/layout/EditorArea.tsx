import { MonacoEditor } from "../editor/MonacoEditor";
import { EditorTabs } from "../workspace/EditorTabs";
import { languageLabel } from "../editor/languages";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function EditorArea() {
  const { document, rootPath } = useWorkspace();
  const hasFile = document !== null;

  return (
    <section className="editor-area island" aria-label="Editors">
      <EditorTabs />
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          <span>
            {hasFile ? document.path : "Open a file from the explorer"}
          </span>
        </div>
        {hasFile ? <span>{languageLabel(document.language)}</span> : null}
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
