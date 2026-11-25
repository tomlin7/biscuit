import { useMemo } from "react";
import type { OutlineSymbol } from "../lsp/outlineScan";
import { kindShort } from "../lsp/OutlinePanel";
import "./StickyOutline.css";

type StickyOutlineProps = {
  symbols: OutlineSymbol[];
  cursorLine: number;
  onSelect: (line: number) => void;
};

export function StickyOutline({ symbols, cursorLine, onSelect }: StickyOutlineProps) {
  const activeLine = useMemo(() => {
    let active: OutlineSymbol | null = null;
    for (const sym of symbols) {
      if (sym.line <= cursorLine) {
        active = sym;
      } else {
        break;
      }
    }
    return active?.line ?? null;
  }, [symbols, cursorLine]);

  if (symbols.length === 0) return null;

  return (
    <aside className="sticky-outline" aria-label="Sticky Outline">
      <div className="sticky-outline__header">
        <span>Outline</span>
        <span className="sticky-outline__badge">{symbols.length}</span>
      </div>
      <ul className="sticky-outline__list">
        {symbols.map((symbol) => {
          const kind = symbol.kind.toLowerCase();
          const isActive = symbol.line === activeLine;
          return (
            <li key={`${symbol.line}-${symbol.kind}-${symbol.name}`}>
              <button
                type="button"
                className={`sticky-outline__row${isActive ? " sticky-outline__row--active" : ""}`}
                style={{ paddingLeft: 6 + Math.min(symbol.depth * 8, 24) }}
                title={`${symbol.kind}: ${symbol.name} (line ${symbol.line})`}
                onClick={() => onSelect(symbol.line)}
              >
                <span className={`outline-panel__kind outline-panel__kind--${kind}`}>
                  {kindShort(symbol.kind)}
                </span>
                <span className="sticky-outline__name">{symbol.name}</span>
                <span className="sticky-outline__line">:{symbol.line}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
