type Listener = () => void;

let listener: Listener | null = null;

export function setToggleAmendListener(next: Listener | null) {
  listener = next;
}

export function requestToggleAmend() {
  listener?.();
}
