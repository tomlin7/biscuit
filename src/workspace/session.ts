const KEY = "t3d.session";
const LAST_CLOSED_KEY = "t3d.session.lastClosed";

export type EditorSession = {
  root: string;
  roots?: string[];
  tabs: string[];
  active: string | null;
  preview?: boolean;
  split?: boolean;
  splitOrientation?: "right" | "down";
  splitRatio?: number;
  secondary?: string | null;
  paneLayout?:
    | "single"
    | "columns-2"
    | "rows-2"
    | "columns-3"
    | "rows-3"
    | "grid-2x2"
    | "split-left-stacked-right"
    | "split-top-two-bottom";
  panePaths?: string[];
  activePaneIndex?: number;
  secondarySplitRatio?: number;
};

export function readSession(): EditorSession | null {
  return parseSession(localStorage.getItem(KEY));
}

/** The session that was active before the workspace was last closed. */
export function readLastClosedSession(): EditorSession | null {
  return parseSession(localStorage.getItem(LAST_CLOSED_KEY));
}

function parseSession(raw: string | null): EditorSession | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorSession>;
    if (!parsed.root || typeof parsed.root !== "string") return null;
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.filter((path): path is string => typeof path === "string")
      : [];
    return {
      root: parsed.root,
      roots: Array.isArray(parsed.roots)
        ? parsed.roots.filter((path): path is string => typeof path === "string" && path.length > 0)
        : [parsed.root],
      tabs,
      active: typeof parsed.active === "string" ? parsed.active : null,
      preview: parsed.preview === true,
      split: parsed.split === true,
      splitOrientation:
        parsed.splitOrientation === "down" ? "down" : parsed.split ? "right" : undefined,
      splitRatio:
        typeof parsed.splitRatio === "number" &&
        Number.isFinite(parsed.splitRatio) &&
        parsed.splitRatio >= 0.2 &&
        parsed.splitRatio <= 0.8
          ? parsed.splitRatio
          : undefined,
      secondary: typeof parsed.secondary === "string" ? parsed.secondary : null,
      paneLayout:
        parsed.paneLayout === "single" ||
        parsed.paneLayout === "columns-2" ||
        parsed.paneLayout === "rows-2" ||
        parsed.paneLayout === "columns-3" ||
        parsed.paneLayout === "rows-3" ||
        parsed.paneLayout === "grid-2x2" ||
        parsed.paneLayout === "split-left-stacked-right" ||
        parsed.paneLayout === "split-top-two-bottom"
          ? parsed.paneLayout
          : undefined,
      panePaths: Array.isArray(parsed.panePaths)
        ? parsed.panePaths.filter((p): p is string => typeof p === "string")
        : undefined,
      activePaneIndex:
        typeof parsed.activePaneIndex === "number" &&
        Number.isInteger(parsed.activePaneIndex) &&
        parsed.activePaneIndex >= 0
          ? parsed.activePaneIndex
          : undefined,
      secondarySplitRatio:
        typeof parsed.secondarySplitRatio === "number" &&
        Number.isFinite(parsed.secondarySplitRatio) &&
        parsed.secondarySplitRatio >= 0.2 &&
        parsed.secondarySplitRatio <= 0.8
          ? parsed.secondarySplitRatio
          : undefined,
    };
  } catch {
    return null;
  }
}

export function writeSession(session: EditorSession | null) {
  if (!session) {
    const previous = localStorage.getItem(KEY);
    if (previous) localStorage.setItem(LAST_CLOSED_KEY, previous);
    localStorage.removeItem(KEY);
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function patchSession(partial: Partial<EditorSession>) {
  const current = readSession();
  if (!current) return;
  writeSession({ ...current, ...partial });
}
