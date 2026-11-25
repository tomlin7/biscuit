type RunListener = (path: string) => void;

let listener: RunListener | null = null;
let pending: string | null = null;

export function requestRunFile(path: string) {
  if (listener) listener(path);
  else pending = path;
}

export function setRunListener(next: RunListener | null) {
  listener = next;
  if (next && pending) {
    const path = pending;
    pending = null;
    next(path);
  }
}
