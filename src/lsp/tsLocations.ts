import * as monaco from "monaco-editor";
import { typescript } from "monaco-editor";
import { readTextFile } from "@tauri-apps/plugin-fs";

export type SpanLocation = {
  path: string;
  line: number;
  column: number;
  preview: string;
  start: number;
  length: number;
};

type TsClient = {
  getReferencesAtPosition(fileName: string, position: number): Promise<
    Array<{ fileName?: string; textSpan?: { start?: number; length?: number } }> | undefined
  >;
  getRenameInfo(fileName: string, position: number, options: object): Promise<{
    canRename?: boolean;
    displayName?: string;
    localizedErrorMessage?: string;
  }>;
  findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename: boolean,
  ): Promise<
    ReadonlyArray<{ fileName?: string; textSpan?: { start?: number; length?: number } }> | undefined
  >;
  getQuickInfoAtPosition(
    fileName: string,
    position: number,
  ): Promise<{ displayParts?: Array<{ text: string }>; documentation?: Array<{ text: string }> | string } | undefined>;
};

export function fsPathFromTs(fileName: string): string {
  if (fileName.startsWith("file:")) return monaco.Uri.parse(fileName).fsPath;
  return fileName;
}

export async function spanLocation(
  fileName: string,
  start: number,
  length = 0,
): Promise<SpanLocation> {
  const path = fsPathFromTs(fileName);
  const text = await readTextFile(path);
  const before = text.slice(0, start);
  const line = before.split(/\n/).length;
  const lastBreak = before.lastIndexOf("\n");
  const column = start - (lastBreak < 0 ? 0 : lastBreak);
  const preview = (text.split(/\n/)[line - 1] ?? "").trim().slice(0, 180);
  return { path, line, column, preview, start, length };
}

export async function tsClient(
  model: monaco.editor.ITextModel,
): Promise<{ client: TsClient; offset: number } | null> {
  const language = model.getLanguageId();
  if (language !== "typescript" && language !== "javascript") return null;
  const worker = await typescript.getTypeScriptWorker();
  const client = (await worker(model.uri)) as TsClient;
  return { client, offset: 0 };
}

export async function renamePlan(
  model: monaco.editor.ITextModel,
  offset: number,
  nextName: string,
): Promise<{ ok: true; files: Array<{ path: string; text: string }> } | { ok: false; message: string; current?: string }> {
  const session = await tsClient(model);
  if (!session) {
    return { ok: false, message: "Rename is available for JavaScript and TypeScript." };
  }
  const info = await session.client.getRenameInfo(model.uri.toString(), offset, {});
  if (!info.canRename) {
    return {
      ok: false,
      message: info.localizedErrorMessage || "Cannot rename this symbol.",
    };
  }
  if (!nextName) {
    return { ok: false, message: "", current: info.displayName ?? "" };
  }
  const locations = await session.client.findRenameLocations(
    model.uri.toString(),
    offset,
    false,
    false,
    false,
  );
  const byFile = new Map<string, Array<{ start: number; length: number }>>();
  for (const location of locations ?? []) {
    const start = location.textSpan?.start;
    const length = location.textSpan?.length;
    if (!location.fileName || start == null || length == null) continue;
    const path = fsPathFromTs(location.fileName);
    const spans = byFile.get(path) ?? [];
    spans.push({ start, length });
    byFile.set(path, spans);
  }
  if (byFile.size === 0) {
    return { ok: false, message: "The language service found no rename locations." };
  }
  const files: Array<{ path: string; text: string }> = [];
  for (const [path, spans] of byFile) {
    let text = await readTextFile(path);
    for (const span of spans.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, span.start) + nextName + text.slice(span.start + span.length);
    }
    files.push({ path, text });
  }
  return { ok: true, files };
}

export async function referencesAt(
  model: monaco.editor.ITextModel,
  offset: number,
): Promise<SpanLocation[]> {
  const session = await tsClient(model);
  if (!session) return [];
  const refs = await session.client.getReferencesAtPosition(model.uri.toString(), offset);
  const located: SpanLocation[] = [];
  for (const ref of refs ?? []) {
    const start = ref.textSpan?.start;
    if (!ref.fileName || start == null) continue;
    located.push(await spanLocation(ref.fileName, start, ref.textSpan?.length ?? 0));
    if (located.length >= 100) break;
  }
  return located;
}
