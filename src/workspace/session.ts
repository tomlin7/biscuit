const KEY = "t3d.session";

export type EditorSession = {
  root: string;
  roots?: string[];
  tabs: string[];
  active: string | null;
  preview?: boolean;
  split?: boolean;
  secondary?: string | null;
};

export function readSession(): EditorSession | null {
  try {
    const raw = localStorage.getItem(KEY);
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
      secondary: typeof parsed.secondary === "string" ? parsed.secondary : null,
    };
  } catch {
    return null;
  }
}

export function writeSession(session: EditorSession | null) {
  if (!session) {
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
