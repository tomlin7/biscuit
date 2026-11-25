type Listener = () => void;

let listener: Listener | null = null;

export function setRenameActiveTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestRenameActiveTerminal() {
  listener?.();
}
