type DiffPayload = {
  path: string;
  text: string;
  head?: string | null;
  working?: string | null;
  cwd?: string | null;
  staged?: boolean;
  ignoreSpace?: boolean;
};

type Listener = (payload: DiffPayload | null) => void;

let current: DiffPayload | null = null;
const listeners = new Set<Listener>();

export function openDiffTab(
  path: string,
  text: string,
  extras?: {
    head?: string | null;
    working?: string | null;
    cwd?: string | null;
    staged?: boolean;
    ignoreSpace?: boolean;
  },
) {
  current = {
    path,
    text,
    head: extras?.head ?? null,
    working: extras?.working ?? null,
    cwd: extras?.cwd ?? null,
    staged: extras?.staged ?? false,
    ignoreSpace: extras?.ignoreSpace ?? false,
  };
  for (const listen of listeners) listen(current);
}

export function patchDiffTab(partial: Partial<DiffPayload>) {
  if (!current) return;
  current = { ...current, ...partial };
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
