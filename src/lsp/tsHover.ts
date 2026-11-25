import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import { hoverAt } from "../lsp/tsLocations";

let registered = false;

export function registerTsHoverProviders(monaco: Monaco) {
  if (registered) return;
  registered = true;
  for (const language of ["typescript", "javascript", "typescriptreact", "javascriptreact"]) {
    monaco.languages.registerHoverProvider(language, {
      provideHover: async (
        model: MonacoNS.editor.ITextModel,
        position: MonacoNS.Position,
      ) => {
        const offset = model.getOffsetAt(position);
        const info = await hoverAt(model, offset);
        if (!info) return null;
        const contents: Array<{ value: string }> = [];
        if (info.title) contents.push({ value: "```ts\n" + info.title + "\n```" });
        if (info.docs) contents.push({ value: info.docs });
        if (contents.length === 0) return null;
        const word = model.getWordAtPosition(position);
        return {
          range: word
            ? new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn,
              )
            : undefined,
          contents,
        };
      },
    });
  }
}
