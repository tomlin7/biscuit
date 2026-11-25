import { exists, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { applyEditorConfigText, editorConfigFor } from "../editor/editorconfig";
import { searchWorkspace, type SearchHit } from "../search/workspaceSearch";
import { pathInsideRoot } from "./workspacePath";

const MAX_FILE_CHARS = 20_000;
const MAX_LIST = 200;
const MAX_SEARCH = 40;

export function formatSearchHits(hits: SearchHit[]): string {
  if (hits.length === 0) return "No results";
  const shown = hits.slice(0, MAX_SEARCH);
  const extra = hits.length > shown.length ? `\n…[${hits.length - shown.length} more]` : "";
  return `${shown.map((hit) => `${hit.path}:${hit.line}:${hit.column} ${hit.preview}`).join("\n")}${extra}`;
}

export type ToolOutcome = {
  ok: boolean;
  text: string;
};

function outside(): ToolOutcome {
  return { ok: false, text: "path is outside the workspace" };
}

export type OpenBuffer = {
  path: string;
  value: string;
  baseline: string;
};

export type FileHost = {
  tabs: OpenBuffer[];
  setValueAt: (path: string, value: string) => void;
  applyDiskValue: (path: string, value: string) => void;
};

const noFiles: FileHost = {
  tabs: [],
  setValueAt() {},
  applyDiskValue() {},
};

function samePath(left: string, right: string): boolean {
  return left.replace(/\\/g, "/").toLowerCase() === right.replace(/\\/g, "/").toLowerCase();
}

export function replaceOnce(source: string, find: string, replacement: string): string | null {
  if (!find) return null;
  const index = source.indexOf(find);
  if (index < 0) return null;
  return source.slice(0, index) + replacement + source.slice(index + find.length);
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

export async function searchWorkspaceText(root: string, query: string): Promise<ToolOutcome> {
  const needle = query.trim();
  if (!needle) return { ok: false, text: "query is empty" };
  try {
    const hits = await searchWorkspace(root, needle, { matchCase: false, useRegex: false });
    return { ok: true, text: formatSearchHits(hits) };
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) };
  }
}

export async function editWorkspaceFile(
  root: string,
  input: string,
  find: string,
  replacement: string,
  host: FileHost = noFiles,
): Promise<ToolOutcome> {
  const path = pathInsideRoot(root, input);
  if (!path) return outside();
  const tab = host.tabs.find((item) => samePath(item.path, path));
  try {
    const source = tab ? tab.value : await readTextFile(path);
    const next = replaceOnce(source, find, replacement);
    if (next === null) return { ok: false, text: find ? "text was not found" : "find text is empty" };
    if (tab) {
      host.setValueAt(tab.path, next);
      return { ok: true, text: `Updated ${path} in the editor. Save to write it.` };
    }
    const config = await editorConfigFor(path, root);
    const text = applyEditorConfigText(next, config);
    await writeTextFile(path, text);
    return { ok: true, text: `Wrote ${path}` };
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) };
  }
}

export async function writeWorkspaceFile(
  root: string,
  input: string,
  contents: string,
  host: FileHost = noFiles,
): Promise<ToolOutcome> {
  const path = pathInsideRoot(root, input);
  if (!path) return outside();
  const tab = host.tabs.find((item) => samePath(item.path, path));
  try {
    if (tab && tab.value !== tab.baseline) {
      host.setValueAt(tab.path, contents);
      return { ok: true, text: `Updated ${path} in the editor. Save to write it.` };
    }
    if (!tab && !(await exists(path))) {
      const config = await editorConfigFor(path, root);
      const text = applyEditorConfigText(contents, config);
      await writeTextFile(path, text);
      return { ok: true, text: `Wrote ${path}` };
    }
    const config = await editorConfigFor(path, root);
    const text = applyEditorConfigText(contents, config);
    await writeTextFile(path, text);
    if (tab) host.applyDiskValue(tab.path, text);
    return { ok: true, text: `Wrote ${path}` };
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) };
  }
}

export async function runAgentTool(
  name: string,
  args: Record<string, string>,
  root: string,
  host: FileHost = noFiles,
): Promise<ToolOutcome> {
  if (!root) return { ok: false, text: "Open a folder first." };
  if (name === "read_file") return readWorkspaceFile(root, args.path ?? "");
  if (name === "list_directory") return listWorkspaceDirectory(root, args.path ?? ".");
  if (name === "search_text") return searchWorkspaceText(root, args.query ?? "");
  if (name === "edit_file") {
    return editWorkspaceFile(root, args.path ?? "", args.find ?? "", args.replace ?? "", host);
  }
  if (name === "write_file") {
    return writeWorkspaceFile(root, args.path ?? "", args.contents ?? "", host);
  }
  return { ok: false, text: `unknown tool ${name}` };
}
