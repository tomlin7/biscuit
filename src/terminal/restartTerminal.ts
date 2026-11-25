type Listener = () => void;

let listener: Listener | null = null;

export function setRestartActiveTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestRestartActiveTerminal() {
  listener?.();
}
