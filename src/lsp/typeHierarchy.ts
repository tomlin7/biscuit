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
 * Strips balanced generic type arguments (<...>) from a type signature.
 */
export function stripGenerics(str: string): string {
  let result = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "<") {
      depth++;
    } else if (ch === ">") {
      if (depth > 0) depth--;
    } else if (depth === 0) {
      result += ch;
    }
  }
  return result;
}

/**
 * Parses supertypes (extends and implements clauses) from a class or interface declaration line.
 */
export function parseSupertypes(line: string): { extendsList: string[]; implementsList: string[] } {
  const trimmed = line.trim();
  const braceIdx = trimmed.indexOf("{");
  const decl = braceIdx >= 0 ? trimmed.slice(0, braceIdx) : trimmed;

  const extendsMatch = /\bextends\s+([^\\{]+)/.exec(decl);
  const implementsMatch = /\bimplements\s+([^\\{]+)/.exec(decl);

  const extendsList: string[] = [];
  if (extendsMatch?.[1]) {
    // If implements follows extends, cut at 'implements'
    const extRaw = extendsMatch[1].split(/\bimplements\b/)[0];
    const stripped = stripGenerics(extRaw);
    for (const part of stripped.split(",")) {
      const name = part.trim().split(/\s+/)[0];
      if (name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        extendsList.push(name);
      }
    }
  }

  const implementsList: string[] = [];
  if (implementsMatch?.[1]) {
    const impRaw = implementsMatch[1];
    const stripped = stripGenerics(impRaw);
    for (const part of stripped.split(",")) {
      const name = part.trim().split(/\s+/)[0];
      if (name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        implementsList.push(name);
      }
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
  const typeDeclRegex =
    /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(class|interface)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;

    const match = typeDeclRegex.exec(trimmed);
    if (!match) return;

    const kind = match[1] as "class" | "interface";
    const subName = match[2];
    if (subName === typeName) return;

    const { extendsList, implementsList } = parseSupertypes(trimmed);
    const isExtends = extendsList.includes(typeName);
    const isImplements = implementsList.includes(typeName);

    if (isExtends || isImplements) {
      subtypes.push({
        name: subName,
        kind,
        path: filePath,
        line: index + 1,
        column: 1,
        preview: trimmed.slice(0, 160),
        detail: isExtends ? "extends" : "implements",
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
