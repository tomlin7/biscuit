import { invoke } from "@tauri-apps/api/core";
import { appendLog } from "../../logs/logBus";
import type { ExtensionManifest } from "../ExtensionsContext";
import type {
  HostRequestMethod,
  InputBoxOptions,
  MainToWorker,
  MessageLevel,
  QuickPickOptions,
  WorkerToMain,
  WorkspaceSnapshot,
} from "./protocol";

/** Editor capabilities the host exposes to extensions; provided by the app shell. */
export type HostServices = {
  showMessage: (level: MessageLevel, message: string, extensionName: string) => void;
  showInputBox: (options: InputBoxOptions) => Promise<string | undefined>;
  showQuickPick: (items: string[], options: QuickPickOptions) => Promise<string | undefined>;
  executeCoreCommand: (command: string, args: unknown[]) => Promise<unknown>;
  openExternal: (url: string) => Promise<void>;
  writeClipboard: (text: string) => Promise<void>;
  getWorkspaceState: () => WorkspaceSnapshot;
};

export type ActivationRecord = {
  status: "activating" | "active" | "failed";
  ms?: number;
  error?: string;
  reason: string;
};

type Deferred = { resolve: (value: unknown) => void; reject: (error: Error) => void };

function activationEventsFor(manifest: ExtensionManifest): string[] {
  const events = new Set(manifest.activationEvents ?? []);
  for (const command of manifest.contributes?.commands ?? []) {
    if (!command.runs) events.add(`onCommand:${command.id}`);
  }
  for (const webview of manifest.contributes?.webviews ?? []) {
    events.add(`onView:${webview.id}`);
    events.add(`onView:${manifest.id}/${webview.id}`);
  }
  return [...events];
}

/**
 * Owns the extension host worker. Nothing is spawned until the first activation event
 * matches an enabled extension, so installed-but-idle extensions cost only their manifest.
 */
class ExtensionHost {
  private worker: Worker | null = null;
  private manifests: ExtensionManifest[] = [];
  private activations = new Map<string, Promise<void>>();
  private activationWaiters = new Map<string, Deferred>();
  private commandCalls = new Map<number, Deferred>();
  private registeredCommands = new Map<string, string>();
  private records = new Map<string, ActivationRecord>();
  private listeners = new Set<() => void>();
  private services: HostServices | null = null;
  private nextCallId = 1;
  private snapshot: ReadonlyMap<string, ActivationRecord> = new Map();

  setServices(services: HostServices) {
    this.services = services;
  }

  setManifests(manifests: ExtensionManifest[]) {
    this.manifests = manifests.filter((manifest) => manifest.enabled && manifest.main);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getRecords = (): ReadonlyMap<string, ActivationRecord> => this.snapshot;

  /** True when an enabled extension with code declares this command. */
  ownsCommand(command: string): boolean {
    return this.manifests.some((manifest) =>
      activationEventsFor(manifest).includes(`onCommand:${command}`),
    );
  }

  /** Fires an activation event such as `onStartupFinished` or `onLanguage:python`. */
  fireEvent(event: string) {
    for (const manifest of this.manifests) {
      const events = activationEventsFor(manifest);
      const matches =
        events.includes(event) ||
        (event === "onStartupFinished" && events.includes("*"));
      if (matches) void this.activate(manifest.id, event).catch(() => {});
    }
  }

  async executeCommand(command: string, args: unknown[] = []): Promise<unknown> {
    const owner = this.manifests.find((manifest) =>
      activationEventsFor(manifest).includes(`onCommand:${command}`),
    );
    if (owner) await this.activate(owner.id, `onCommand:${command}`);
    if (!this.registeredCommands.has(command)) {
      throw new Error(
        owner
          ? `${owner.name} activated but did not register ${command}`
          : `No extension provides ${command}`,
      );
    }
    const worker = this.ensureWorker();
    const callId = this.nextCallId++;
    return new Promise((resolve, reject) => {
      this.commandCalls.set(callId, { resolve, reject });
      this.send(worker, { type: "invokeCommand", callId, command, args });
    });
  }

  /** Terminates the worker; extensions re-activate lazily on their next event. */
  restart() {
    this.worker?.terminate();
    this.worker = null;
    for (const waiter of this.activationWaiters.values()) {
      waiter.reject(new Error("Extension host restarted"));
    }
    for (const call of this.commandCalls.values()) {
      call.reject(new Error("Extension host restarted"));
    }
    this.activations.clear();
    this.activationWaiters.clear();
    this.commandCalls.clear();
    this.registeredCommands.clear();
    this.records.clear();
    this.emit();
  }

  activate(extensionId: string, reason: string): Promise<void> {
    const existing = this.activations.get(extensionId);
    if (existing) return existing;
    const manifest = this.manifests.find((item) => item.id === extensionId);
    if (!manifest?.main) return Promise.reject(new Error(`${extensionId} has no code to run`));
    const main = manifest.main;
    this.setRecord(extensionId, { status: "activating", reason });
    const promise = (async () => {
      const code = await invoke<string>("read_extension_file", { id: extensionId, path: main });
      const worker = this.ensureWorker();
      await new Promise((resolve, reject) => {
        this.activationWaiters.set(extensionId, { resolve, reject });
        this.send(worker, { type: "activate", extensionId, code });
      });
    })();
    this.activations.set(extensionId, promise);
    promise.catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (this.activations.get(extensionId) === promise) this.activations.delete(extensionId);
      this.setRecord(extensionId, { status: "failed", error: message, reason });
      appendLog(`[${extensionId}] activation failed: ${message}`);
    });
    return promise;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "t3d-extension-host",
    });
    worker.addEventListener("message", (event: MessageEvent<WorkerToMain>) => {
      void this.onMessage(worker, event.data);
    });
    worker.addEventListener("error", (event) => {
      appendLog(`Extension host error: ${event.message}`);
    });
    this.worker = worker;
    appendLog("Extension host started");
    return worker;
  }

  private send(worker: Worker, message: MainToWorker) {
    worker.postMessage(message);
  }

  private async onMessage(worker: Worker, message: WorkerToMain) {
    switch (message.type) {
      case "activated": {
        this.setRecord(message.extensionId, {
          status: "active",
          ms: message.ms,
          reason: this.records.get(message.extensionId)?.reason ?? "",
        });
        appendLog(`[${message.extensionId}] activated in ${message.ms} ms`);
        this.activationWaiters.get(message.extensionId)?.resolve(undefined);
        this.activationWaiters.delete(message.extensionId);
        break;
      }
      case "activationFailed": {
        this.activationWaiters.get(message.extensionId)?.reject(new Error(message.error));
        this.activationWaiters.delete(message.extensionId);
        break;
      }
      case "registerCommand":
        this.registeredCommands.set(message.command, message.extensionId);
        break;
      case "unregisterCommand":
        if (this.registeredCommands.get(message.command) === message.extensionId) {
          this.registeredCommands.delete(message.command);
        }
        break;
      case "commandResult": {
        const call = this.commandCalls.get(message.callId);
        if (!call) break;
        this.commandCalls.delete(message.callId);
        if (message.ok) call.resolve(message.value);
        else call.reject(new Error(message.error));
        break;
      }
      case "log":
        appendLog(`[${message.extensionId}] ${message.message}`);
        break;
      case "request": {
        try {
          const value = await this.handleRequest(message.extensionId, message.method, message.params);
          this.send(worker, { type: "response", callId: message.callId, ok: true, value: value ?? null });
        } catch (error) {
          this.send(worker, {
            type: "response",
            callId: message.callId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      }
    }
  }

  private async handleRequest(
    extensionId: string,
    method: HostRequestMethod,
    params: unknown,
  ): Promise<unknown> {
    const services = this.services;
    if (!services) throw new Error("The editor is not ready yet");
    const p = (params ?? {}) as Record<string, unknown>;
    const name = this.manifests.find((item) => item.id === extensionId)?.name ?? extensionId;
    switch (method) {
      case "window.showMessage":
        services.showMessage(p.level as MessageLevel, String(p.message ?? ""), name);
        return null;
      case "window.showInputBox":
        return services.showInputBox(p as InputBoxOptions);
      case "window.showQuickPick":
        return services.showQuickPick(
          Array.isArray(p.items) ? p.items.map(String) : [],
          (p.options ?? {}) as QuickPickOptions,
        );
      case "commands.executeCommand": {
        const command = String(p.command ?? "");
        const args = Array.isArray(p.args) ? p.args : [];
        if (this.registeredCommands.has(command) || this.ownsCommand(command)) {
          return this.executeCommand(command, args);
        }
        return services.executeCoreCommand(command, args);
      }
      case "env.openExternal": {
        const url = String(p.url ?? "");
        if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
          throw new Error("openExternal only accepts http, https, and mailto URLs");
        }
        return services.openExternal(url);
      }
      case "env.writeClipboard":
        return services.writeClipboard(String(p.text ?? ""));
      case "workspace.getState":
        return services.getWorkspaceState();
      default:
        throw new Error(`Unknown extension API method ${String(method)}`);
    }
  }

  private setRecord(extensionId: string, record: ActivationRecord) {
    this.records.set(extensionId, record);
    this.emit();
  }

  private emit() {
    this.snapshot = new Map(this.records);
    for (const listener of this.listeners) listener();
  }
}

export const extensionHost = new ExtensionHost();
