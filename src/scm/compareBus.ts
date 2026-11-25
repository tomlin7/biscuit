export type CompareState = {
  base: string;
  head: string;
  activeFile?: string | null;
};

type Listener = (state: CompareState | null) => void;

let current: CompareState | null = null;
const listeners = new Set<Listener>();

export function openCompareTab(base = "main", head = "HEAD") {
  current = { base, head, activeFile: null };
  for (const listener of listeners) listener(current);
}

export function patchCompareTab(patch: Partial<CompareState>) {
  if (!current) return;
  current = { ...current, ...patch };
  for (const listener of listeners) listener(current);
}

export function closeCompareTab() {
  current = null;
  for (const listener of listeners) listener(null);
}

export function subscribeCompare(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
