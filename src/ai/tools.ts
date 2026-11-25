import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
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

export async function runAgentTool(
  name: string,
  args: Record<string, string>,
  root: string,
): Promise<ToolOutcome> {
  if (!root) return { ok: false, text: "Open a folder first." };
  if (name === "read_file") return readWorkspaceFile(root, args.path ?? "");
  if (name === "list_directory") return listWorkspaceDirectory(root, args.path ?? ".");
  if (name === "search_text") return searchWorkspaceText(root, args.query ?? "");
  return { ok: false, text: `unknown tool ${name}` };
}
