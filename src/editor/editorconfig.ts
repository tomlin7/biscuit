import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { basename, parentPath } from "../workspace/path";

export type ResolvedEditorConfig = {
  indentStyle: "space" | "tab" | null;
  indentSize: number | null;
  endOfLine: "lf" | "crlf" | null;
  insertFinalNewline: boolean | null;
  trimTrailingWhitespace: boolean | null;
};

const EMPTY: ResolvedEditorConfig = {
  indentStyle: null,
  indentSize: null,
  endOfLine: null,
  insertFinalNewline: null,
  trimTrailingWhitespace: null,
};

function globMatches(pattern: string, fileName: string): boolean {
  const source = pattern
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${source}$`, "i").test(fileName);
}

function applyPair(config: ResolvedEditorConfig, key: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (key === "indent_style" && (normalized === "space" || normalized === "tab")) {
    config.indentStyle = normalized;
  } else if (key === "indent_size" || key === "tab_width") {
    const size = Number(normalized);
    if (Number.isFinite(size) && size > 0 && size <= 16) config.indentSize = size;
  } else if (key === "end_of_line" && (normalized === "lf" || normalized === "crlf")) {
    config.endOfLine = normalized;
  } else if (key === "insert_final_newline") {
    if (normalized === "true" || normalized === "false") config.insertFinalNewline = normalized === "true";
  } else if (key === "trim_trailing_whitespace") {
    if (normalized === "true" || normalized === "false") {
      config.trimTrailingWhitespace = normalized === "true";
    }
  }
}

function parseFile(text: string, fileName: string, into: ResolvedEditorConfig): boolean {
  let matched = true;
  let root = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const section = /^\[(.+)]$/.exec(line);
    if (section) {
      matched = section[1].split(",").some((part) => globMatches(part, fileName));
      continue;
    }
    const pair = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!pair) continue;
    const key = pair[1].toLowerCase();
    if (key === "root" && pair[2].trim().toLowerCase() === "true") root = true;
    if (matched) applyPair(into, key, pair[2]);
  }
  return root;
}

export async function editorConfigFor(
  filePath: string,
  rootPath: string | null,
): Promise<ResolvedEditorConfig> {
  const config = { ...EMPTY };
  const fileName = basename(filePath);
  let dir = parentPath(filePath);
  const stop = rootPath ? rootPath.replace(/[\\/]+$/, "").toLowerCase() : null;
  const seen = new Set<string>();

  while (dir && !seen.has(dir.toLowerCase())) {
    seen.add(dir.toLowerCase());
    const sep = dir.includes("\\") ? "\\" : "/";
    const candidate = dir.endsWith("\\") || dir.endsWith("/")
      ? `${dir}.editorconfig`
      : `${dir}${sep}.editorconfig`;
    if (await exists(candidate)) {
      const rootStop = parseFile(await readTextFile(candidate), fileName, config);
      if (rootStop) break;
    }
    if (stop && dir.replace(/[\\/]+$/, "").toLowerCase() === stop) break;
    dir = parentPath(dir);
  }
  return config;
}

export function applyEditorConfigText(value: string, config: ResolvedEditorConfig): string {
  let next = value;
  if (config.trimTrailingWhitespace) {
    next = next
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join(next.includes("\r\n") ? "\r\n" : "\n");
  }
  if (config.endOfLine === "lf") next = next.replace(/\r\n/g, "\n");
  if (config.endOfLine === "crlf") next = next.replace(/\r?\n/g, "\r\n");
  if (config.insertFinalNewline && next.length > 0 && !next.endsWith("\n")) {
    next += config.endOfLine === "crlf" ? "\r\n" : "\n";
  }
  return next;
}
