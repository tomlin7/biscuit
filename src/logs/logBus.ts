export type LogLine = {
  id: string;
  time: number;
  message: string;
};

const MAX_LINES = 200;
let lines: LogLine[] = [];
const listeners = new Set<(lines: LogLine[]) => void>();

function publish() {
  const snapshot = lines;
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
  publish();
}

export function subscribeLogs(listener: (lines: LogLine[]) => void) {
  listeners.add(listener);
  listener(lines);
  return () => {
    listeners.delete(listener);
  };
}
