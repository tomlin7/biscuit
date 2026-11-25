import { useDebug } from "./DebugContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import "./DebugPanel.css";

export function DebugPanel() {
  const {
    breakpoints,
    sessions,
    removeBreakpoint,
    toggleBreakpoint,
    startSession,
    stopSession,
  } = useDebug();
  const { activePath, openFileAt } = useWorkspace();

  return (
    <div className="debug-panel">
      <div className="debug-panel__toolbar">
        <button
          type="button"
          disabled={!activePath}
          onClick={() => {
            if (activePath) void startSession(activePath);
          }}
        >
          Run / Debug current file
        </button>
      </div>

      <section className="debug-panel__section">
        <h3>Sessions</h3>
        {sessions.length === 0 ? (
          <p className="debug-panel__hint">No debug sessions.</p>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li key={session.id}>
                <span>
                  {session.running ? "●" : "○"} {session.label}
                </span>
                {session.running ? (
                  <button
                    type="button"
                    onClick={() => void stopSession(session.id)}
                  >
                    Stop
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="debug-panel__section">
        <h3>Breakpoints</h3>
        {breakpoints.length === 0 ? (
          <p className="debug-panel__hint">
            Click a line gutter in the editor to add a breakpoint.
          </p>
        ) : (
          <ul>
            {breakpoints.map((bp) => (
              <li key={bp.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={bp.enabled}
                    onChange={() => toggleBreakpoint(bp.id)}
                  />
                  <button
                    type="button"
                    className="debug-panel__link"
                    onClick={() => void openFileAt(bp.path, bp.line, 1)}
                  >
                    {bp.path}:{bp.line}
                  </button>
                </label>
                <button type="button" onClick={() => removeBreakpoint(bp.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
