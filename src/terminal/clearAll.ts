type Listener = () => void;

let listener: Listener | null = null;

export function setClearAllTerminalsListener(next: Listener | null) {
  listener = next;
}

export function requestClearAllTerminals() {
  listener?.();
}
