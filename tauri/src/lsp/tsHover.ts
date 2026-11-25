import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";

let registered = false;

export function registerTsHoverProviders(monaco?: Monaco | null) {
  if (registered) return;
  if (!monaco?.languages?.registerHoverProvider) return;
  try {
    for (const language of ["typescript", "javascript", "typescriptreact", "javascriptreact"]) {
      monaco.languages.registerHoverProvider(language, {
        provideHover: async (
          model: MonacoNS.editor.ITextModel,
          position: MonacoNS.Position,
        ) => {
          const offset = model.getOffsetAt(position);
          let info = null;
          try {
            const { hoverAt } = await import("../lsp/tsLocations");
            info = await hoverAt(model, offset);
          } catch {
            return null;
          }
          if (!info) return null;
          const contents: Array<{ value: string }> = [];
          if (info.title) contents.push({ value: "```ts\n" + info.title + "\n```" });
          if (info.docs) contents.push({ value: info.docs });
          if (contents.length === 0) return null;
          const word = model.getWordAtPosition(position);
          const range = word
            ? (monaco.Range
                ? new monaco.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn,
                  )
                : {
                    startLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: word.endColumn,
                  })
            : undefined;
          return {
            range,
            contents,
          };
        },
      });
    }
    registered = true;
  } catch (err) {
    console.warn("Failed to register TS hover providers:", err);
  }
}
