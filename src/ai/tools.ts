import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { pathInsideRoot } from "./workspacePath";

const MAX_FILE_CHARS = 20_000;
const MAX_LIST = 200;

export type ToolOutcome = {
  ok: boolean;
  text: string;
};

function outside(): ToolOutcome {
  return { ok: false, text: "path is outside the workspace" };
}

export async function readWorkspaceFile(root: string, input: string): Promise<ToolOutcome> {
  const path = pathInsideRoot(root, input);
  if (!path) return outside();
  try {
    const text = await readTextFile(path);
    if (text.length <= MAX_FILE_CHARS) return { ok: true, text };
    return { ok: true, text: `${text.slice(0, MAX_FILE_CHARS)}\n…[truncated]` };
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) };
  }
}

export async function listWorkspaceDirectory(root: string, input: string): Promise<ToolOutcome> {
  const path = pathInsideRoot(root, input.trim() ? input : ".");
  if (!path) return outside();
  try {
    const entries = await readDir(path);
    const lines = entries
      .filter((entry) => entry.name && entry.name !== ".DS_Store")
      .map((entry) => `${entry.isDirectory ? "dir" : "file"} ${entry.name}`)
      .sort((a, b) => a.localeCompare(b));
    const shown = lines.slice(0, MAX_LIST);
    const extra = lines.length > shown.length ? `\n…[${lines.length - shown.length} more]` : "";
    return { ok: true, text: `${shown.join("\n")}${extra}` };
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) };
  }
}

export async function runAgentTool(
  name: string,
  args: Record<string, string>,
  root: string,
): Promise<ToolOutcome> {
  if (!root) return { ok: false, text: "Open a folder first." };
  if (name === "read_file") return readWorkspaceFile(root, args.path ?? "");
  if (name === "list_directory") return listWorkspaceDirectory(root, args.path ?? ".");
  return { ok: false, text: `unknown tool ${name}` };
}
