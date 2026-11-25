export type InputAction =
  | { type: "echo"; text: string }
  | { type: "erase-local"; count: number }
  | { type: "write-pty"; data: string }
  | { type: "hash"; prompt: string };

export function hashPrompt(line: string): string | null {
  const match = /^\s*#\s*([\s\S]*)$/.exec(line);
  if (!match) return null;
  const body = match[1].trim();
  if (!body) return null;
  return body;
}

export function reduceTerminalInput(
  line: string,
  data: string,
): { line: string; actions: InputAction[] } {
  const actions: InputAction[] = [];
  if (data.startsWith("\u001b")) {
    if (line.length > 0) actions.push({ type: "write-pty", data: line });
    actions.push({ type: "write-pty", data });
    return { line: "", actions };
  }

  let current = line;
  for (const ch of data) {
    if (ch === "\r" || ch === "\n") {
      const prompt = hashPrompt(current);
      if (prompt) {
        actions.push({ type: "erase-local", count: current.length });
        actions.push({ type: "echo", text: "\r\n" });
        actions.push({ type: "hash", prompt });
      } else if (/^\s*#\s*$/.test(current) && current.includes("#")) {
        actions.push({ type: "erase-local", count: current.length });
      } else {
        if (current.length > 0) actions.push({ type: "erase-local", count: current.length });
        actions.push({ type: "write-pty", data: `${current}\r` });
      }
      current = "";
      continue;
    }
    if (ch === "\u007f" || ch === "\b") {
      if (current.length === 0) actions.push({ type: "write-pty", data: ch });
      else {
        current = current.slice(0, -1);
        actions.push({ type: "erase-local", count: 1 });
      }
      continue;
    }
    if (ch < " ") {
      if (current.length > 0) actions.push({ type: "write-pty", data: current });
      actions.push({ type: "write-pty", data: ch });
      current = "";
      continue;
    }
    current += ch;
    actions.push({ type: "echo", text: ch });
  }
  return { line: current, actions };
}
