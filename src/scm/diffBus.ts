type DiffPayload = {
  path: string;
  text: string;
};

type Listener = (payload: DiffPayload | null) => void;

let current: DiffPayload | null = null;
const listeners = new Set<Listener>();

export function openDiffTab(path: string, text: string) {
  current = { path, text };
  for (const listen of listeners) listen(current);
}

export function closeDiffTab() {
  current = null;
  for (const listen of listeners) listen(null);
}

export function subscribeDiff(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
