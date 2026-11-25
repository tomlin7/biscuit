type ScrollDirection = "previous" | "next";

type Listener = (direction: ScrollDirection) => void;

let listener: Listener | null = null;

export function setScrollCommandListener(next: Listener | null) {
  listener = next;
}

export function requestScrollCommand(direction: ScrollDirection) {
  listener?.(direction);
}
