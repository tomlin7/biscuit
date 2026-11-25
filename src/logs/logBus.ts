import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export type LogLine = {
  id: string;
  time: number;
  message: string;
};

const STORAGE_KEY = "t3d.logs.v1";
const MAX_LINES = 200;

function loadPersistedLogs(): LogLine[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_LINES) : [];
  } catch {
    return [];
  }
}

let lines: LogLine[] = loadPersistedLogs();
const listeners = new Set<(lines: LogLine[]) => void>();

function publish() {
  const snapshot = lines;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  } catch {
    /* ignore storage quota errors */
  }
  for (const listener of listeners) listener(snapshot);
}

export function appendLog(message: string) {
  lines = [
    ...lines,
    { id: crypto.randomUUID(), time: Date.now(), message },
  ].slice(-MAX_LINES);
  publish();
}

export function clearLogs() {
  lines = [];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  publish();
}

export function subscribeLogs(listener: (lines: LogLine[]) => void) {
  listeners.add(listener);
  listener(lines);
  return () => {
    listeners.delete(listener);
  };
}

export function formatLogs(logLines?: LogLine[]): string {
  const target = logLines ?? lines;
  return target
    .map((l) => `[${new Date(l.time).toLocaleTimeString()}] ${l.message}`)
    .join("\n");
}

export async function exportLogsToFile(defaultName = "t3d.log"): Promise<string | null> {
  const text = formatLogs();
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    try {
      const selected = await saveDialog({
        defaultPath: defaultName,
        filters: [{ name: "Log file", extensions: ["log", "txt"] }],
      });
      if (!selected) return null;
      await writeTextFile(selected, text);
      return selected;
    } catch {
      /* fallback to web download */
    }
  }

  // Web download fallback
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return defaultName;
  } catch {
    return null;
  }
}
