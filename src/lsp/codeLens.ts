import type * as MonacoType from "monaco-editor";
import { scanOutline } from "./outlineScan";

let registered = false;

export function findSymbolColumn(lineContent: string, symName: string): number {
  if (!symName) return 1;
  const escaped = symName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`);
  const match = regex.exec(lineContent);
  return match ? match.index + 1 : 1;
}

export function registerCodeLensProvider(
  monacoInstance?: typeof MonacoType,
): MonacoType.IDisposable | null {
  if (registered) return null;
  const monaco =
    monacoInstance ??
    (typeof window !== "undefined"
      ? (window as unknown as { monaco?: typeof MonacoType }).monaco
      : undefined);
  if (!monaco) return null;
  registered = true;

  const languages = ["typescript", "javascript"];
  const disposables: MonacoType.IDisposable[] = [];

  for (const lang of languages) {
    const disp = monaco.languages.registerCodeLensProvider(lang, {
      provideCodeLenses(model) {
        if (model.isDisposed()) return { lenses: [], dispose: () => {} };
        const text = model.getValue();
        const symbols = scanOutline(text, model.getLanguageId());

        const lenses: MonacoType.languages.CodeLens[] = [];
        for (const sym of symbols) {
          // Provide code lenses above functions, classes, interfaces, and methods
          if (
            sym.kind === "function" ||
            sym.kind === "class" ||
            sym.kind === "interface" ||
            sym.kind === "method" ||
            sym.kind === "type"
          ) {
            lenses.push({
              range: {
                startLineNumber: sym.line,
                startColumn: 1,
                endLineNumber: sym.line,
                endColumn: 1,
              },
              id: `${model.uri.toString()}#${sym.line}#${sym.name}`,
            });
          }
        }

        return { lenses, dispose: () => {} };
      },

      async resolveCodeLens(model, codeLens) {
        if (model.isDisposed()) return codeLens;
        const line = codeLens.range.startLineNumber;
        const lineContent = model.getLineContent(line) ?? "";
        const idParts = (codeLens.id ?? "").split("#");
        const symName = idParts.length >= 3 ? idParts.slice(2).join("#") : "";
        const col = findSymbolColumn(lineContent, symName);
        const offset = model.getOffsetAt({ lineNumber: line, column: col });

        let count = 0;
        try {
          const { referencesAt } = await import("./tsLocations");
          const refs = await referencesAt(model, offset);
          count = refs.length;
        } catch {
          count = 0;
        }

        const title = `${count} ${count === 1 ? "reference" : "references"}`;
        codeLens.command = {
          id: "editor.action.referenceSearch.trigger",
          title,
          arguments: [model.uri, { lineNumber: line, column: col }],
        };

        return codeLens;
      },
    });

    disposables.push(disp);
  }

  return {
    dispose: () => {
      disposables.forEach((d) => d.dispose());
      registered = false;
    },
  };
}
