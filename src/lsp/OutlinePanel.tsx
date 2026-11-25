import { useEffect, useMemo, useState } from "react";
import * as monaco from "monaco-editor";
import { typescript } from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { scanOutline, type OutlineSymbol } from "./outlineScan";
import "./OutlinePanel.css";

type Symbol = OutlineSymbol;

type NavNode = {
  text: string;
  kind: string;
  spans: Array<{ start: number }>;
  childItems?: NavNode[];
};

function flattenNav(
  nodes: NavNode[] | undefined,
  model: monaco.editor.ITextModel,
  depth: number,
  out: Symbol[],
) {
  for (const node of nodes ?? []) {
    const start = node.spans?.[0]?.start;
    const name = node.text?.trim();
    if (name && start != null && !name.startsWith("<")) {
      out.push({
        name,
        kind: node.kind || "symbol",
        line: model.getPositionAt(start).lineNumber,
        depth,
      });
    }
    flattenNav(node.childItems, model, depth + 1, out);
  }
}

async function languageServiceOutline(path: string): Promise<Symbol[] | null> {
  const normalized = path.replace(/\\/g, "/");
  const model = monaco.editor.getModels().find((item) => {
    const uri = item.uri.path.replace(/\\/g, "/");
    return uri === normalized || uri.endsWith(`/${normalized}`) || normalized.endsWith(uri);
  });
  if (!model) return null;
  const language = model.getLanguageId();
  if (language !== "typescript" && language !== "javascript") return null;
  const worker = await typescript.getTypeScriptWorker();
  const client = await worker(model.uri);
  const tree = (await client.getNavigationTree(model.uri.toString())) as NavNode;
  const symbols: Symbol[] = [];
  flattenNav(tree.childItems, model, 0, symbols);
  return symbols;
}

export async function symbolsForFile(
  path: string,
  text: string,
  language: string,
): Promise<Symbol[]> {
  const scanned = scanOutline(text, language);
  if (language !== "typescript" && language !== "javascript") return scanned;
  try {
    const fromLanguageService = await languageServiceOutline(path);
    if (fromLanguageService && fromLanguageService.length > 0) return fromLanguageService;
  } catch {
    /* scanned symbols stay */
  }
  return scanned;
}

export function OutlinePanel() {
  const { document, openFileAt } = useWorkspace();
  const fallback = useMemo(
    () => (document ? scanOutline(document.value, document.language) : []),
    [document],
  );
  const [symbols, setSymbols] = useState<Symbol[]>(fallback);

  useEffect(() => {
    setSymbols(fallback);
    if (!document) return;
    if (document.language !== "typescript" && document.language !== "javascript") {
      return;
    }
    let cancelled = false;
    void languageServiceOutline(document.path)
      .then((next) => {
        if (!cancelled && next && next.length > 0) setSymbols(next);
      })
      .catch(() => {
        if (!cancelled) setSymbols(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [document, fallback]);

  if (!document) {
    return (
      <div className="outline-panel outline-panel--empty">
        <p className="outline-panel__hint">Open a file to see its outline.</p>
      </div>
    );
  }

  return (
    <div className="outline-panel">
      {symbols.length === 0 ? (
        <p className="outline-panel__hint">No symbols in this file.</p>
      ) : (
        <ul className="outline-panel__list">
          {symbols.map((symbol) => (
            <li key={`${symbol.line}-${symbol.kind}-${symbol.name}`}>
              <button
                type="button"
                className="outline-panel__row"
                style={{ paddingLeft: 8 + symbol.depth * 12 }}
                onClick={() => void openFileAt(document.path, symbol.line, 1)}
              >
                <span className="outline-panel__kind">{symbol.kind}</span>
                <span className="outline-panel__name">{symbol.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
