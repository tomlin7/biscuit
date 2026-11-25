let currentDraggedTab: string | null = null;
const listeners = new Set<(path: string | null) => void>();

export function setDraggedTab(path: string | null) {
  currentDraggedTab = path;
  for (const fn of listeners) {
    try {
      fn(path);
    } catch {
      /* ignore */
    }
  }
}

export function getDraggedTab(): string | null {
  return currentDraggedTab;
}

export function subscribeDraggedTab(fn: (path: string | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
