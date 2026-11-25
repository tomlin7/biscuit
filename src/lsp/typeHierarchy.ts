import type * as monaco from "monaco-editor";
import { scanOutline, type OutlineSymbol } from "./outlineScan";

export type TypeHierarchyItem = {
  name: string;
  kind: "class" | "interface" | "type";
  path: string;
  line: number;
  column: number;
  preview: string;
  detail?: string;
};

export type TypeHierarchyResult = {
  root: TypeHierarchyItem;
  supertypes: TypeHierarchyItem[];
  subtypes: TypeHierarchyItem[];
};

/**
 * Parses supertypes (extends and implements clauses) from a class or interface declaration line.
 */
export function parseSupertypes(line: string): { extendsList: string[]; implementsList: string[] } {
  const trimmed = line.trim();
  const extendsMatch = /\bextends\s+([^\\{]+)/.exec(trimmed);
  const implementsMatch = /\bimplements\s+([^\\{]+)/.exec(trimmed);

  const extendsList: string[] = [];
  if (extendsMatch?.[1]) {
    // If implements follows extends, cut at 'implements'
    const extRaw = extendsMatch[1].split(/\bimplements\b/)[0];
    for (const part of extRaw.split(",")) {
      const name = part.trim().split(/\s+/)[0].replace(/<.*>$/, "");
      if (name) extendsList.push(name);
    }
  }

  const implementsList: string[] = [];
  if (implementsMatch?.[1]) {
    const impRaw = implementsMatch[1].split("{")[0];
    for (const part of impRaw.split(",")) {
      const name = part.trim().split(/\s+/)[0].replace(/<.*>$/, "");
      if (name) implementsList.push(name);
    }
  }

  return { extendsList, implementsList };
}

/**
 * Searches text for classes and interfaces that inherit from or implement typeName.
 */
export function findSubtypesInText(
  text: string,
  typeName: string,
  filePath: string,
): TypeHierarchyItem[] {
  const lines = text.split(/\r?\n/);
  const subtypes: TypeHierarchyItem[] = [];
  const escaped = typeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const classRegex = new RegExp(
    `^(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?class\\s+(\\w+)(?:<[^>]+>)?\\s+(?:extends\\s+[^{]*?\\b${escaped}\\b|implements\\s+[^{]*?\\b${escaped}\\b)`,
  );
  const interfaceRegex = new RegExp(
    `^(?:export\\s+)?(?:default\\s+)?interface\\s+(\\w+)(?:<[^>]+>)?\\s+extends\\s+[^{]*?\\b${escaped}\\b`,
  );

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;

    let match = classRegex.exec(trimmed);
    let kind: "class" | "interface" = "class";
    if (!match) {
      match = interfaceRegex.exec(trimmed);
      kind = "interface";
    }

    if (match?.[1] && match[1] !== typeName) {
      subtypes.push({
        name: match[1],
        kind,
        path: filePath,
        line: index + 1,
        column: 1,
        preview: trimmed.slice(0, 160),
      });
    }
  });

  return subtypes;
}

/**
 * Computes type hierarchy for a JS/TS model at the given position.
 */
export async function getTypeHierarchy(
  model: monaco.editor.ITextModel,
  position: { lineNumber: number; column: number },
): Promise<TypeHierarchyResult | null> {
  const language = model.getLanguageId();
  if (language !== "typescript" && language !== "javascript") return null;

  const word = model.getWordAtPosition(position);
  const text = model.getValue();
  const symbols = scanOutline(text, language);

  let rootSymbol: OutlineSymbol | null = null;
  for (const sym of symbols) {
    if (sym.kind === "class" || sym.kind === "interface" || sym.kind === "type") {
      if (sym.line <= position.lineNumber) {
        if (!rootSymbol || sym.line > rootSymbol.line) {
          rootSymbol = sym;
        }
      }
    }
  }

  const name = rootSymbol?.name ?? word?.word;
  if (!name) return null;

  const rootPath = model.uri.fsPath || model.uri.path;
  const rootLine = rootSymbol ? rootSymbol.line : position.lineNumber;
  const rootPreview = (model.getLineContent(rootLine) ?? "").trim();
  const rootKind = (rootSymbol?.kind === "interface" ? "interface" : "class") as "class" | "interface";

  const root: TypeHierarchyItem = {
    name,
    kind: rootKind,
    path: rootPath,
    line: rootLine,
    column: word?.startColumn ?? 1,
    preview: rootPreview,
  };

  // Supertypes from declaration line
  const { extendsList, implementsList } = parseSupertypes(rootPreview);
  const supertypes: TypeHierarchyItem[] = [];

  for (const ext of extendsList) {
    const foundSym = symbols.find((s) => s.name === ext);
    supertypes.push({
      name: ext,
      kind: foundSym?.kind === "interface" ? "interface" : "class",
      path: rootPath,
      line: foundSym ? foundSym.line : 1,
      column: 1,
      preview: foundSym ? (model.getLineContent(foundSym.line) ?? "").trim() : `class ${ext}`,
      detail: "extends",
    });
  }

  for (const imp of implementsList) {
    const foundSym = symbols.find((s) => s.name === imp);
    supertypes.push({
      name: imp,
      kind: "interface",
      path: rootPath,
      line: foundSym ? foundSym.line : 1,
      column: 1,
      preview: foundSym ? (model.getLineContent(foundSym.line) ?? "").trim() : `interface ${imp}`,
      detail: "implements",
    });
  }

  // Subtypes in current model
  const subtypes = findSubtypesInText(text, name, rootPath);

  return {
    root,
    supertypes,
    subtypes,
  };
}
