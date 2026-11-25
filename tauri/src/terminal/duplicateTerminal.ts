type Listener = () => void;

let listener: Listener | null = null;

export function setDuplicateTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestDuplicateTerminal() {
  listener?.();
}
