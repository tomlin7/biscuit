export type EditorInstance = {
  editor: unknown;
  statusElement: HTMLElement | null;
};

export type EditorListener = (instance: EditorInstance) => (() => void) | void;

class EditorRegistry {
  private active = new Set<EditorInstance>();
  private listeners = new Set<EditorListener>();

  registerEditor(editor: unknown, statusElement: HTMLElement | null): () => void {
    const item: EditorInstance = { editor, statusElement };
    this.active.add(item);
    const cleanups: Array<(() => void) | void> = [];
    for (const listener of this.listeners) {
      try {
        cleanups.push(listener(item));
      } catch (err) {
        console.warn("Editor listener error:", err);
      }
    }
    return () => {
      this.active.delete(item);
      for (const cleanup of cleanups) {
        if (typeof cleanup === "function") {
          try {
            cleanup();
          } catch {}
        }
      }
    };
  }

  onDidCreateEditor(listener: EditorListener): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  getEditors(): EditorInstance[] {
    return Array.from(this.active);
  }
}

export const editorRegistry = new EditorRegistry();
