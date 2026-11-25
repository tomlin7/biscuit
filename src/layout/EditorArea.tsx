import { MonacoEditor } from "../editor/MonacoEditor";
import { useEditorSession } from "../editor/EditorSession";

export function EditorArea() {
  const session = useEditorSession();
  const tabLabel = session.dirty ? `${session.title} •` : session.title;

  return (
    <section className="editor-area" aria-label="Editors">
      <div className="editor-area__tabs" role="tablist" aria-label="Open editors">
        <div
          className="editor-area__tab editor-area__tab--active"
          role="tab"
          aria-selected="true"
        >
          {tabLabel}
        </div>
      </div>
      <div className="editor-area__surface">
        <MonacoEditor />
      </div>
    </section>
  );
}
