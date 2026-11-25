type SplitMode = "toggle" | "right" | "close" | "open";

type Listener = (mode: SplitMode, path?: string) => void;

let listener: Listener | null = null;

export function setSplitEditorListener(next: Listener | null) {
  listener = next;
}

export function requestSplitEditor(mode: SplitMode = "toggle", path?: string) {
  listener?.(mode, path);
}

export function requestOpenInSplit(path: string) {
  listener?.("open", path);
}
