const KEY = "t3d.session";

export type EditorSession = {
  root: string;
  tabs: string[];
  active: string | null;
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
      tabs,
      active: typeof parsed.active === "string" ? parsed.active : null,
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
