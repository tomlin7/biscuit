import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import "./TerminalFindWidget.css";

type Props = {
  term: Terminal | null;
  onClose: () => void;
};

type Match = {
  line: number;
  col: number;
  length: number;
};

export function TerminalFindWidget({ term, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const search = useCallback(() => {
    if (!term || !query) {
      setMatches([]);
      setActiveIndex(-1);
      term?.clearSelection();
      return;
    }

    const buffer = term.buffer.active;
    const count = buffer.length;
    const found: Match[] = [];

    let re: RegExp;
    try {
      let pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (wholeWord) pattern = `\\b${pattern}\\b`;
      re = new RegExp(pattern, matchCase ? "g" : "gi");
    } catch {
      setMatches([]);
      setActiveIndex(-1);
      return;
    }

    for (let y = 0; y < count; y++) {
      const line = buffer.getLine(y);
      if (!line) continue;
      const text = line.translateToString(true);
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        found.push({
          line: y,
          col: m.index,
          length: m[0].length,
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }

    setMatches(found);
    if (found.length > 0) {
      setActiveIndex(0);
      const first = found[0];
      term.select(first.col, first.line, first.length);
      term.scrollToLine(first.line);
    } else {
      setActiveIndex(-1);
      term.clearSelection();
    }
  }, [term, query, matchCase, wholeWord, useRegex]);

  useEffect(() => {
    search();
  }, [search]);

  const goToNext = useCallback(() => {
    if (!term || matches.length === 0) return;
    const nextIdx = (activeIndex + 1) % matches.length;
    setActiveIndex(nextIdx);
    const m = matches[nextIdx];
    term.select(m.col, m.line, m.length);
    term.scrollToLine(m.line);
  }, [term, matches, activeIndex]);

  const goToPrev = useCallback(() => {
    if (!term || matches.length === 0) return;
    const prevIdx = (activeIndex - 1 + matches.length) % matches.length;
    setActiveIndex(prevIdx);
    const m = matches[prevIdx];
    term.select(m.col, m.line, m.length);
    term.scrollToLine(m.line);
  }, [term, matches, activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goToPrev();
      else goToNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="terminal-find-widget" role="search" aria-label="Terminal search">
      <input
        ref={inputRef}
        type="text"
        className="terminal-find-widget__input"
        placeholder="Find in terminal..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <span className="terminal-find-widget__count">
        {query
          ? matches.length > 0
            ? `${activeIndex + 1} of ${matches.length}`
            : "No results"
          : ""}
      </span>

      <div className="terminal-find-widget__toggles">
        <button
          type="button"
          className={`terminal-find-widget__toggle ${matchCase ? "terminal-find-widget__toggle--active" : ""}`}
          title="Match Case (Alt+C)"
          onClick={() => setMatchCase((v) => !v)}
        >
          Aa
        </button>
        <button
          type="button"
          className={`terminal-find-widget__toggle ${wholeWord ? "terminal-find-widget__toggle--active" : ""}`}
          title="Match Whole Word (Alt+W)"
          onClick={() => setWholeWord((v) => !v)}
        >
          \b
        </button>
        <button
          type="button"
          className={`terminal-find-widget__toggle ${useRegex ? "terminal-find-widget__toggle--active" : ""}`}
          title="Use Regular Expression (Alt+R)"
          onClick={() => setUseRegex((v) => !v)}
        >
          .*
        </button>
      </div>

      <div className="terminal-find-widget__nav">
        <button
          type="button"
          className="terminal-find-widget__btn"
          title="Previous Match (Shift+Enter)"
          disabled={matches.length === 0}
          onClick={goToPrev}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="terminal-find-widget__btn"
          title="Next Match (Enter)"
          disabled={matches.length === 0}
          onClick={goToNext}
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="terminal-find-widget__btn"
          title="Close (Escape)"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
