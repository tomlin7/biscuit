type Listener = () => void;

let clearAllListener: Listener | null = null;
let clearActiveListener: Listener | null = null;

export function setClearAllTerminalsListener(next: Listener | null) {
  clearAllListener = next;
}

export function requestClearAllTerminals() {
  clearAllListener?.();
}

export function setClearActiveTerminalListener(next: Listener | null) {
  clearActiveListener = next;
}

export function requestClearActiveTerminal() {
  clearActiveListener?.();
}
