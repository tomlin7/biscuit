type SplitMode = "toggle" | "right" | "close";

type Listener = (mode: SplitMode) => void;

let listener: Listener | null = null;

export function setSplitEditorListener(next: Listener | null) {
  listener = next;
}

export function requestSplitEditor(mode: SplitMode = "toggle") {
  listener?.(mode);
}
