export type SplitMode =
  | "toggle"
  | "right"
  | "down"
  | "left"
  | "up"
  | "grid"
  | "three-columns"
  | "two-columns"
  | "two-rows"
  | "single"
  | "close"
  | "close-all"
  | "next-pane"
  | "open";

export type SplitListener = (mode: SplitMode, path?: string) => void;

let listener: SplitListener | null = null;

export function setSplitEditorListener(next: SplitListener | null) {
  listener = next;
}

export function requestSplitEditor(mode: SplitMode = "toggle", path?: string) {
  listener?.(mode, path);
}

export function requestOpenInSplit(path: string) {
  listener?.("open", path);
}
