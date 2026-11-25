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
    stepPython,
    pythonStop,
    pythonError,
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

      {pythonStop?.event === "stopped" ? (
        <div className="debug-panel__toolbar">
          {(
            [
              ["continue", "Continue"],
              ["next", "Step over"],
              ["step", "Step into"],
              ["return", "Step out"],
            ] as const
          ).map(([command, label]) => (
            <button
              key={command}
              type="button"
              onClick={() => {
                void stepPython(command).then((next) => {
                  const frame = next?.frames[0];
                  if (frame) void openFileAt(frame.file, frame.line, 1);
                });
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (!activePath) return;
              void stopSession(pythonStop.id).then(() => startSession(activePath));
            }}
          >
            Restart
          </button>
        </div>
      ) : null}
      {pythonError ? <p className="debug-panel__hint">{pythonError}</p> : null}
      {pythonStop ? (
        <>
          <section className="debug-panel__section">
            <h3>Call stack</h3>
            {pythonStop.frames.length === 0 ? (
              <p className="debug-panel__hint">
                {pythonStop.event === "exited" ? "The program finished." : "No frames."}
              </p>
            ) : (
              <ul>
                {pythonStop.frames.map((frame) => (
                  <li key={`${frame.file}:${frame.line}:${frame.name}`}>
                    <button
                      type="button"
                      className="debug-panel__link"
                      onClick={() => void openFileAt(frame.file, frame.line, 1)}
                    >
                      {frame.name} {frame.file.split(/[/\\]/).pop()}:{frame.line}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="debug-panel__section">
            <h3>Variables</h3>
            {Object.keys(pythonStop.locals).length === 0 ? (
              <p className="debug-panel__hint">No locals in the top frame.</p>
            ) : (
              <ul>
                {Object.entries(pythonStop.locals).map(([name, value]) => (
                  <li key={name}>
                    <span>
                      {name} = {value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

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
