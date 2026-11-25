import { useEffect, useState } from "react";
import { clearLogs, subscribeLogs, type LogLine } from "./logBus";
import "./LogsPanel.css";

export function LogsPanel() {
  const [lines, setLines] = useState<LogLine[]>([]);

  useEffect(() => subscribeLogs(setLines), []);

  return (
    <div className="logs-panel">
      <div className="logs-panel__bar">
        <button type="button" onClick={clearLogs}>
          Clear
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="logs-panel__empty">No log lines yet.</p>
      ) : (
        <ol className="logs-panel__list">
          {lines.map((line) => (
            <li key={line.id}>
              <time dateTime={new Date(line.time).toISOString()}>
                {new Date(line.time).toLocaleTimeString()}
              </time>
              <span>{line.message}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
