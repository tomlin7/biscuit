type DiffPayload = {
  path: string;
  text: string;
  head?: string | null;
  working?: string | null;
};

type Listener = (payload: DiffPayload | null) => void;

let current: DiffPayload | null = null;
const listeners = new Set<Listener>();

export function openDiffTab(
  path: string,
  text: string,
  extras?: { head?: string | null; working?: string | null },
) {
  current = {
    path,
    text,
    head: extras?.head ?? null,
    working: extras?.working ?? null,
  };
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
