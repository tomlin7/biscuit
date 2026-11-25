type Listener = () => void;

let listener: Listener | null = null;

export function setKillActiveTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestKillActiveTerminal() {
  listener?.();
}
