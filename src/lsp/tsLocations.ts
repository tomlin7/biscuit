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
