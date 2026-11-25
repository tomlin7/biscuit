/// Extension host: runs every activated extension off the UI thread.
/// Extensions only reach the editor through the async `t3d` API below.

import type {
  HostRequestMethod,
  InputBoxOptions,
  KeyPressEvent,
  MainToWorker,
  MessageLevel,
  QuickPickOptions,
  StatusBarAlignment,
  WorkerToMain,
  WorkspaceSnapshot,
} from "./protocol";

type WorkerScope = {
  postMessage: (message: WorkerToMain) => void;
  addEventListener: (type: "message", listener: (event: MessageEvent<MainToWorker>) => void) => void;
};

const scope = self as unknown as WorkerScope;

type Disposable = { dispose: () => void };
type CommandHandler = (...args: unknown[]) => unknown;

type ExtensionModule = {
  activate?: (api: unknown, context: ExtensionContext) => unknown;
  deactivate?: () => unknown;
};

type ExtensionContext = {
  extensionId: string;
  subscriptions: Disposable[];
  log: (message: string) => void;
};

const handlers = new Map<string, { extensionId: string; handler: CommandHandler }>();
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
let nextCallId = 1;

function post(message: WorkerToMain) {
  scope.postMessage(message);
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function request<T>(extensionId: string, method: HostRequestMethod, params: unknown): Promise<T> {
  const callId = nextCallId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(callId, { resolve: resolve as (value: unknown) => void, reject });
    post({ type: "request", callId, extensionId, method, params });
  });
}

type KeyPressListener = (event: KeyPressEvent) => void;
const keyPressListeners = new Set<KeyPressListener>();
let nextStatusBarId = 1;

class StatusBarItemImpl {
  private id: string;
  private extensionId: string;
  private alignment: StatusBarAlignment;
  private priority: number;
  private _text: string = "";
  private _tooltip?: string;
  private _command?: string;
  private _visible: boolean = false;

  constructor(extensionId: string, alignment: StatusBarAlignment = "right", priority: number = 0) {
    this.id = `sb_${extensionId}_${nextStatusBarId++}`;
    this.extensionId = extensionId;
    this.alignment = alignment;
    this.priority = priority;
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = String(value);
    if (this._visible) this.sync();
  }

  get tooltip(): string | undefined {
    return this._tooltip;
  }

  set tooltip(value: string | undefined) {
    this._tooltip = value ? String(value) : undefined;
    if (this._visible) this.sync();
  }

  get command(): string | undefined {
    return this._command;
  }

  set command(value: string | undefined) {
    this._command = value ? String(value) : undefined;
    if (this._visible) this.sync();
  }

  show(): void {
    this._visible = true;
    this.sync();
  }

  hide(): void {
    this._visible = false;
    post({ type: "disposeStatusBarItem", id: this.id });
  }

  dispose(): void {
    this.hide();
  }

  private sync(): void {
    post({
      type: "setStatusBarItem",
      item: {
        id: this.id,
        extensionId: this.extensionId,
        alignment: this.alignment,
        priority: this.priority,
        text: this._text,
        tooltip: this._tooltip,
        command: this._command,
      },
    });
  }
}

function createApi(extensionId: string) {
  const log = (level: MessageLevel, message: string) =>
    post({ type: "log", extensionId, level, message });
  const show = (level: MessageLevel) => (message: string) =>
    request<void>(extensionId, "window.showMessage", { level, message: String(message) });

  return Object.freeze({
    version: 1,
    StatusBarAlignment: Object.freeze({
      Left: "left" as StatusBarAlignment,
      Right: "right" as StatusBarAlignment,
    }),
    commands: Object.freeze({
      registerCommand(command: string, handler: CommandHandler): Disposable {
        const owner = handlers.get(command);
        if (owner && owner.extensionId !== extensionId) {
          throw new Error(`Command ${command} is already registered by ${owner.extensionId}`);
        }
        handlers.set(command, { extensionId, handler });
        post({ type: "registerCommand", extensionId, command });
        return {
          dispose() {
            if (handlers.get(command)?.handler !== handler) return;
            handlers.delete(command);
            post({ type: "unregisterCommand", extensionId, command });
          },
        };
      },
      executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
        return request<T>(extensionId, "commands.executeCommand", { command, args });
      },
    }),
    window: Object.freeze({
      showInformationMessage: show("info"),
      showWarningMessage: show("warning"),
      showErrorMessage: show("error"),
      showInputBox(options: InputBoxOptions = {}): Promise<string | undefined> {
        return request(extensionId, "window.showInputBox", options);
      },
      showQuickPick(items: string[], options: QuickPickOptions = {}): Promise<string | undefined> {
        return request(extensionId, "window.showQuickPick", { items: items.map(String), options });
      },
      createStatusBarItem(alignment: StatusBarAlignment = "right", priority: number = 0) {
        return new StatusBarItemImpl(extensionId, alignment, priority);
      },
      onDidPressKey(listener: KeyPressListener): Disposable {
        keyPressListeners.add(listener);
        return {
          dispose() {
            keyPressListeners.delete(listener);
          },
        };
      },
    }),
    env: Object.freeze({
      openExternal(url: string): Promise<void> {
        return request(extensionId, "env.openExternal", { url: String(url) });
      },
      clipboard: Object.freeze({
        writeText(text: string): Promise<void> {
          return request(extensionId, "env.writeClipboard", { text: String(text) });
        },
      }),
    }),
    workspace: Object.freeze({
      getState(): Promise<WorkspaceSnapshot> {
        return request(extensionId, "workspace.getState", null);
      },
    }),
    log: Object.freeze({
      info: (message: string) => log("info", String(message)),
      warn: (message: string) => log("warning", String(message)),
      error: (message: string) => log("error", String(message)),
    }),
  });
}

async function activate(extensionId: string, code: string) {
  const started = performance.now();
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    const mod = (await import(/* @vite-ignore */ url)) as ExtensionModule;
    const api = createApi(extensionId);
    const context: ExtensionContext = {
      extensionId,
      subscriptions: [],
      log: (message) => post({ type: "log", extensionId, level: "info", message: String(message) }),
    };
    await mod.activate?.(api, context);
    post({ type: "activated", extensionId, ms: Math.round(performance.now() - started) });
  } catch (error) {
    post({ type: "activationFailed", extensionId, error: describe(error) });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function invokeCommand(callId: number, command: string, args: unknown[]) {
  const entry = handlers.get(command);
  if (!entry) {
    post({ type: "commandResult", callId, ok: false, error: `No handler registered for ${command}` });
    return;
  }
  try {
    const value = await entry.handler(...args);
    post({ type: "commandResult", callId, ok: true, value: value ?? null });
  } catch (error) {
    post({ type: "log", extensionId: entry.extensionId, level: "error", message: describe(error) });
    post({ type: "commandResult", callId, ok: false, error: describe(error) });
  }
}

scope.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.type) {
    case "activate":
      void activate(message.extensionId, message.code);
      break;
    case "invokeCommand":
      void invokeCommand(message.callId, message.command, message.args);
      break;
    case "keyPress":
      for (const listener of keyPressListeners) {
        try {
          listener(message.event);
        } catch (_) {}
      }
      break;
    case "response": {
      const entry = pending.get(message.callId);
      if (!entry) break;
      pending.delete(message.callId);
      if (message.ok) entry.resolve(message.value);
      else entry.reject(new Error(message.error));
      break;
    }
  }
});
