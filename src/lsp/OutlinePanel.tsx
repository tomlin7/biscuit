import { useEffect, useMemo, useState } from "react";
import * as monaco from "monaco-editor";
import { typescript } from "monaco-editor";
import { Search, X } from "lucide-react";
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

function kindShort(kind: string): string {
  switch (kind.toLowerCase()) {
    case "function":
      return "fn";
    case "class":
      return "cls";
    case "interface":
      return "int";
    case "method":
      return "m";
    case "variable":
    case "var":
    case "let":
    case "const":
      return "var";
    case "property":
    case "prop":
      return "prop";
    case "enum":
      return "enum";
    case "type":
      return "type";
    default:
      return kind.slice(0, 3);
  }
}

export function OutlinePanel() {
  const { document, openFileAt } = useWorkspace();
  const fallback = useMemo(
    () => (document ? scanOutline(document.value, document.language) : []),
    [document],
  );
  const [symbols, setSymbols] = useState<Symbol[]>(fallback);
  const [filterQuery, setFilterQuery] = useState("");

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

  const filteredSymbols = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.kind.toLowerCase().includes(q),
    );
  }, [symbols, filterQuery]);

  if (!document) {
    return (
      <div className="outline-panel outline-panel--empty">
        <p className="outline-panel__hint">Open a file to view its symbol outline.</p>
      </div>
    );
  }

  return (
    <div className="outline-panel">
      <div className="outline-panel__toolbar">
        <div className="outline-panel__search-wrap">
          <Search size={13} className="outline-panel__search-icon" aria-hidden />
          <input
            className="outline-panel__search-input"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter symbols…"
            aria-label="Filter symbols"
          />
          {filterQuery && (
            <button
              type="button"
              className="outline-panel__search-clear"
              onClick={() => setFilterQuery("")}
              title="Clear filter"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="outline-panel__body">
        {symbols.length === 0 ? (
          <p className="outline-panel__hint">No symbols found in this file.</p>
        ) : filteredSymbols.length === 0 ? (
          <p className="outline-panel__hint">No symbols match &ldquo;{filterQuery}&rdquo;.</p>
        ) : (
          <ul className="outline-panel__list">
            {filteredSymbols.map((symbol) => {
              const kind = symbol.kind.toLowerCase();
              return (
                <li key={`${symbol.line}-${symbol.kind}-${symbol.name}`}>
                  <button
                    type="button"
                    className="outline-panel__row"
                    style={{ paddingLeft: 8 + symbol.depth * 14 }}
                    onClick={() => void openFileAt(document.path, symbol.line, 1)}
                  >
                    <span className={`outline-panel__kind outline-panel__kind--${kind}`}>
                      {kindShort(symbol.kind)}
                    </span>
                    <span className="outline-panel__name">{symbol.name}</span>
                    <span className="outline-panel__loc">:{symbol.line}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
