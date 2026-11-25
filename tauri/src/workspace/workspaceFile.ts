export type T3dWorkspaceFile = {
  version: 1;
  roots: string[];
  tabs?: string[];
  active?: string | null;
};

export function serializeWorkspace(input: {
  roots: string[];
  tabs: string[];
  active: string | null;
}): string {
  const roots = input.roots.filter(Boolean);
  const payload: T3dWorkspaceFile = {
    version: 1,
    roots,
    tabs: input.tabs,
    active: input.active,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseWorkspace(text: string): T3dWorkspaceFile | null {
  try {
    const parsed = JSON.parse(text) as Partial<T3dWorkspaceFile>;
    if (parsed.version !== 1) return null;
    if (!Array.isArray(parsed.roots) || parsed.roots.length === 0) return null;
    const roots = parsed.roots.filter(
      (path): path is string => typeof path === "string" && path.length > 0,
    );
    if (roots.length === 0) return null;
    return {
      version: 1,
      roots,
      tabs: Array.isArray(parsed.tabs)
        ? parsed.tabs.filter((path): path is string => typeof path === "string")
        : [],
      active: typeof parsed.active === "string" ? parsed.active : null,
    };
  } catch {
    return null;
  }
}
