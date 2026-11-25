/** Messages exchanged between the editor (main thread) and the extension host worker. */

export type HostRequestMethod =
  | "window.showMessage"
  | "window.showInputBox"
  | "window.showQuickPick"
  | "commands.executeCommand"
  | "env.openExternal"
  | "env.writeClipboard"
  | "workspace.getState"
  | "scm.getRemoteUrl";

export type MessageLevel = "info" | "warning" | "error";

export type InputBoxOptions = {
  prompt?: string;
  value?: string;
  placeHolder?: string;
};

export type QuickPickOptions = {
  placeHolder?: string;
};

export type WorkspaceSnapshot = {
  rootPath: string | null;
  roots: string[];
  activeDocument: {
    path: string;
    title: string;
    language: string;
    selectionText: string;
    isUntitled: boolean;
  } | null;
};

export type StatusBarAlignment = "left" | "right";

export type StatusBarItemDto = {
  id: string;
  extensionId: string;
  alignment: StatusBarAlignment;
  priority: number;
  text: string;
  tooltip?: string;
  command?: string;
};

export type KeyPressEvent = {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

export type MainToWorker =
  | { type: "activate"; extensionId: string; code: string }
  | { type: "invokeCommand"; callId: number; command: string; args: unknown[] }
  | { type: "keyPress"; event: KeyPressEvent }
  | { type: "response"; callId: number; ok: true; value: unknown }
  | { type: "response"; callId: number; ok: false; error: string };

export type WorkerToMain =
  | { type: "activated"; extensionId: string; ms: number }
  | { type: "activationFailed"; extensionId: string; error: string }
  | { type: "registerCommand"; extensionId: string; command: string }
  | { type: "unregisterCommand"; extensionId: string; command: string }
  | { type: "setStatusBarItem"; item: StatusBarItemDto }
  | { type: "disposeStatusBarItem"; id: string }
  | { type: "commandResult"; callId: number; ok: true; value: unknown }
  | { type: "commandResult"; callId: number; ok: false; error: string }
  | {
      type: "request";
      callId: number;
      extensionId: string;
      method: HostRequestMethod;
      params: unknown;
    }
  | { type: "log"; extensionId: string; level: MessageLevel; message: string };
