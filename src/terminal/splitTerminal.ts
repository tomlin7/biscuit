type Listener = () => void;

let listener: Listener | null = null;

export function setSplitTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestSplitTerminal() {
  listener?.();
}
