const STORAGE_KEY = "t3d.runCommands.v1";

export type RunCommandMap = Record<string, string>;

export function readRunCommands(): RunCommandMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: RunCommandMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function setRunCommand(language: string, command: string) {
  const next = { ...readRunCommands() };
  const trimmed = command.trim();
  if (!trimmed) delete next[language];
  else next[language] = trimmed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Expand `{file}` / `{path}` placeholders into a shell command, or null if unset. */
export function resolveRunCommand(language: string, path: string): string | null {
  const template = readRunCommands()[language];
  if (!template) return null;
  return template.split("{file}").join(path).split("{path}").join(path);
}
