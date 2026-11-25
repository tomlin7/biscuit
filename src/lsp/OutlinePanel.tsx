import { useEffect, useMemo, useState } from "react";
import * as monaco from "monaco-editor";
import { typescript } from "monaco-editor";
import { useWorkspace } from "../workspace/WorkspaceContext";
import "./OutlinePanel.css";

type Symbol = {
  name: string;
  kind: string;
  line: number;
  depth: number;
};

const CODE_PATTERNS: Array<[RegExp, string]> = [
  [/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/, "function"],
  [/^(?:export\s+)?class\s+(\w+)/, "class"],
  [/^(?:export\s+)?interface\s+(\w+)/, "interface"],
  [/^(?:export\s+)?type\s+(\w+)/, "type"],
  [/^(?:export\s+)?enum\s+(\w+)/, "enum"],
  [/^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/, "function"],
  [/^(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)/, "struct"],
  [/^(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)/, "enum"],
  [/^(?:pub(?:\([^)]*\))?\s+)?trait\s+(\w+)/, "trait"],
  [/^(?:async\s+)?def\s+(\w+)/, "function"],
  [/^class\s+(\w+)/, "class"],
];

function scanOutline(text: string, language: string): Symbol[] {
  const lines = text.split(/\r?\n/);
  const out: Symbol[] = [];
  if (language === "markdown" || language === "md") {
    lines.forEach((line, index) => {
      const match = /^(#{1,6})\s+(.+)$/.exec(line);
      if (!match) return;
      out.push({
        name: match[2].trim(),
        kind: "heading",
        line: index + 1,
        depth: match[1].length - 1,
      });
    });
    return out;
  }
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return;
    for (const [pattern, kind] of CODE_PATTERNS) {
      const match = pattern.exec(trimmed);
      if (!match?.[1]) continue;
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      out.push({
        name: match[1],
        kind,
        line: index + 1,
        depth: Math.min(6, Math.floor(indent / 2)),
      });
      break;
    }
  });
  return out;
}

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
