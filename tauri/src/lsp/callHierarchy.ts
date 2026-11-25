import type * as monaco from "monaco-editor";
import { scanOutline, type OutlineSymbol } from "./outlineScan";

export type CallReferenceHit = {
  path: string;
  line: number;
  column: number;
  preview: string;
  start?: number;
  length?: number;
};

export type CallHierarchyItem = {
  name: string;
  kind: string;
  path: string;
  line: number;
  column: number;
  preview: string;
  callerName?: string;
};

export type CallHierarchyResult = {
  root: CallHierarchyItem;
  incoming: CallHierarchyItem[];
  outgoing: CallHierarchyItem[];
};

/**
 * Extracts outgoing function calls from the text of a function body.
 */
export function extractOutgoingCalls(
  bodyText: string,
  startLine: number,
  filePath: string,
  selfName?: string,
): CallHierarchyItem[] {
  const lines = bodyText.split(/\r?\n/);
  const calls: CallHierarchyItem[] = [];
  const reserved = new Set([
    "if", "for", "while", "switch", "catch", "function", "return",
    "super", "import", "require", "export", "typeof", "sizeof",
    "void", "new", "delete", "yield", "await", "throw", "case", "with"
  ]);

  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
    const regex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const callName = match[1];
      if (reserved.has(callName)) continue;
      // Skip the function's own declaration name on start line
      if (index === 0 && selfName && callName === selfName) continue;
      // Skip if preceded by function or class keywords on the same line
      const prefix = line.slice(0, match.index).trimEnd();
      if (/\b(?:function\*?|class)\s*$/.test(prefix)) continue;
      const key = `${callName}:${index + 1}`;
      if (seen.has(key)) continue;
      seen.add(key);

      calls.push({
        name: callName,
        kind: "function",
        path: filePath,
        line: startLine + index,
        column: match.index + 1,
        preview: trimmed.slice(0, 160),
      });
    }
  });

  return calls;
}

/**
 * Maps incoming reference hits to their enclosing caller functions.
 */
export function mapIncomingReferences(
  hits: CallReferenceHit[],
  root: { path: string; line: number },
  fileSymbolsMap?: Map<string, OutlineSymbol[]>,
): CallHierarchyItem[] {
  const incoming: CallHierarchyItem[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    // Skip declaration itself
    if (hit.path === root.path && hit.line === root.line) continue;
    const key = `${hit.path}:${hit.line}:${hit.column}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const symbols = fileSymbolsMap?.get(hit.path) ?? [];
    let enclosingCaller: OutlineSymbol | null = null;
    for (const sym of symbols) {
      if (sym.line <= hit.line) {
        if (!enclosingCaller || sym.line >= enclosingCaller.line) {
          enclosingCaller = sym;
        }
      }
    }

    incoming.push({
      name: enclosingCaller ? enclosingCaller.name : "(module)",
      kind: enclosingCaller ? enclosingCaller.kind : "module",
      path: hit.path,
      line: hit.line,
      column: hit.column,
      preview: hit.preview,
      callerName: enclosingCaller ? enclosingCaller.name : "(module)",
    });
  }

  return incoming;
}

/**
 * Computes call hierarchy for a JS/TS model at the given position.
 */
export async function getCallHierarchy(
  model: monaco.editor.ITextModel,
  position: { lineNumber: number; column: number },
): Promise<CallHierarchyResult | null> {
  const language = model.getLanguageId();
  if (language !== "typescript" && language !== "javascript") return null;

  const word = model.getWordAtPosition(position);
  const text = model.getValue();
  const symbols = scanOutline(text, language);

  let rootSymbol: OutlineSymbol | null = null;
  for (const sym of symbols) {
    if (sym.line <= position.lineNumber) {
      if (!rootSymbol || sym.line > rootSymbol.line) {
        rootSymbol = sym;
      }
    }
  }

  const name = rootSymbol?.name ?? word?.word;
  if (!name) return null;

  const rootPath = model.uri.fsPath || model.uri.path;
  const rootLine = rootSymbol ? rootSymbol.line : position.lineNumber;
  const rootPreview = (model.getLineContent(rootLine) ?? "").trim();

  const root: CallHierarchyItem = {
    name,
    kind: rootSymbol?.kind ?? "function",
    path: rootPath,
    line: rootLine,
    column: word?.startColumn ?? 1,
    preview: rootPreview,
  };

  // 1. Incoming calls via references
  const offset = model.getOffsetAt({ lineNumber: rootLine, column: word?.startColumn ?? 1 });
  let incoming: CallHierarchyItem[] = [];
  try {
    const { referencesAt } = await import("./tsLocations");
    const hits = await referencesAt(model, offset);
    const fileSymbolsMap = new Map<string, OutlineSymbol[]>();
    fileSymbolsMap.set(rootPath, symbols);
    incoming = mapIncomingReferences(hits, { path: rootPath, line: rootLine }, fileSymbolsMap);
  } catch {
    incoming = [];
  }

  // 2. Outgoing calls by scanning the function body
  let endLine = model.getLineCount();
  if (rootSymbol) {
    for (const sym of symbols) {
      if (sym.line > rootSymbol.line && sym.depth <= rootSymbol.depth) {
        endLine = sym.line - 1;
        break;
      }
    }
  }
  const lines: string[] = [];
  for (let l = rootLine; l <= Math.min(rootLine + 200, endLine); l++) {
    lines.push(model.getLineContent(l) ?? "");
  }
  const outgoing = extractOutgoingCalls(lines.join("\n"), rootLine, rootPath, name);

  return {
    root,
    incoming,
    outgoing,
  };
}
