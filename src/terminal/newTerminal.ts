type Listener = () => void;

let listener: Listener | null = null;

export function setNewTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestNewTerminal() {
  listener?.();
}
