type FocusMode = "next" | "previous" | "active";

type Listener = (mode: FocusMode) => void;

let listener: Listener | null = null;

export function setFocusTerminalListener(next: Listener | null) {
  listener = next;
}

export function requestFocusTerminal(mode: FocusMode) {
  listener?.(mode);
}
