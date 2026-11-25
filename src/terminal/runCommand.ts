const MAX_OUTPUT = 8_000;

type CommandRequest = {
  command: string;
  cwd: string;
};

type CommandListener = (request: CommandRequest, done: (text: string) => void) => void;

let listener: CommandListener | null = null;
let pending: { request: CommandRequest; done: (text: string) => void } | null = null;

export function requestRunCommand(request: CommandRequest): Promise<string> {
  return new Promise((resolve) => {
    if (listener) listener(request, resolve);
    else pending = { request, done: resolve };
  });
}

export function setCommandListener(next: CommandListener | null) {
  listener = next;
  if (next && pending) {
    const queued = pending;
    pending = null;
    next(queued.request, queued.done);
  }
}

type ShowListener = () => void;
let showListener: ShowListener | null = null;

export function requestShowTerminal() {
  showListener?.();
}

export function setShowTerminalListener(next: ShowListener | null) {
  showListener = next;
}

export function commandLabel(command: string): string {
  const text = command.trim();
  return text.length > 40 ? text.slice(0, 40) : text;
}

export function finishCommandOutput(text: string, stillRunning: boolean): string {
  const clean = text
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "")
    .slice(0, MAX_OUTPUT);
  if (!stillRunning) return clean;
  return `${clean}${clean ? "\n" : ""}Command is still running in the terminal.`;
}
