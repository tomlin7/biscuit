type Listener = () => void;

let listener: Listener | null = null;

export function setFindTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestFindTerminal() {
  listener?.();
}
