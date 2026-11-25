import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Ban, Copy, Search, X } from "lucide-react";
import { clearLogs, subscribeLogs, type LogLine } from "./logBus";
import { IconButton } from "../ui/IconButton";
import "./LogsPanel.css";

export function LogsPanel() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => subscribeLogs(setLines), []);

  const filteredLines = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => l.message.toLowerCase().includes(q));
  }, [lines, filter]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);

  const copyAll = () => {
    const text = filteredLines
      .map(
        (l) => `[${new Date(l.time).toLocaleTimeString()}] ${l.message}`,
      )
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="logs-panel">
      <div className="logs-panel__bar">
        <div className="logs-panel__search-wrap">
          <Search size={12} className="logs-panel__search-icon" aria-hidden />
          <input
            className="logs-panel__search-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter output…"
            aria-label="Filter logs"
          />
          {filter && (
            <button
              type="button"
              className="logs-panel__search-clear"
              onClick={() => setFilter("")}
              title="Clear filter"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="logs-panel__actions">
          <IconButton
            icon={ArrowDownToLine}
            label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
            size={13}
            active={autoScroll}
            onClick={() => setAutoScroll((v) => !v)}
          />
          <IconButton
            icon={Copy}
            label="Copy all output"
            size={13}
            disabled={filteredLines.length === 0}
            onClick={copyAll}
          />
          <IconButton
            icon={Ban}
            label="Clear output"
            size={13}
            disabled={lines.length === 0}
            onClick={clearLogs}
          />
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="logs-panel__empty">No output log lines yet.</p>
      ) : filteredLines.length === 0 ? (
        <p className="logs-panel__empty">No lines match filter &ldquo;{filter}&rdquo;.</p>
      ) : (
        <ol ref={listRef} className="logs-panel__list">
          {filteredLines.map((line) => (
            <li key={line.id} className="logs-panel__row">
              <time
                dateTime={new Date(line.time).toISOString()}
                className="logs-panel__time"
              >
                {new Date(line.time).toLocaleTimeString()}
              </time>
              <span className="logs-panel__msg">{line.message}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
