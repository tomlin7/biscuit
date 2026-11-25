import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  Square,
  StepForward,
  Trash2,
} from "lucide-react";
import { useDebug } from "./DebugContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
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

  const [openSections, setOpenSections] = useState({
    sessions: true,
    stack: true,
    variables: true,
    breakpoints: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isStopped = pythonStop?.event === "stopped";
  const activeSession = sessions.find((s) => s.running) ?? sessions[0];

  return (
    <div className="debug-panel">
      <div className="debug-panel__header-bar">
        <button
          type="button"
          className="debug-panel__start-btn"
          disabled={!activePath}
          onClick={() => {
            if (activePath) void startSession(activePath);
          }}
          title={activePath ? `Debug ${basename(activePath)}` : "Open a file to start debugging"}
        >
          <Play size={13} className="debug-panel__play-icon" />
          <span>{activePath ? `Debug ${basename(activePath)}` : "Debug Current File"}</span>
        </button>
      </div>

      {isStopped && (
        <div className="debug-panel__control-toolbar" role="toolbar" aria-label="Debug controls">
          <IconButton
            icon={Play}
            label="Continue (F5)"
            size={14}
            onClick={() => {
              void stepPython("continue").then((next) => {
                const frame = next?.frames[0];
                if (frame) void openFileAt(frame.file, frame.line, 1);
              });
            }}
          />
          <IconButton
            icon={StepForward}
            label="Step Over (F10)"
            size={14}
            onClick={() => {
              void stepPython("next").then((next) => {
                const frame = next?.frames[0];
                if (frame) void openFileAt(frame.file, frame.line, 1);
              });
            }}
          />
          <IconButton
            icon={ArrowDown}
            label="Step Into (F11)"
            size={14}
            onClick={() => {
              void stepPython("step").then((next) => {
                const frame = next?.frames[0];
                if (frame) void openFileAt(frame.file, frame.line, 1);
              });
            }}
          />
          <IconButton
            icon={ArrowUp}
            label="Step Out (Shift+F11)"
            size={14}
            onClick={() => {
              void stepPython("return").then((next) => {
                const frame = next?.frames[0];
                if (frame) void openFileAt(frame.file, frame.line, 1);
              });
            }}
          />
          <IconButton
            icon={RotateCcw}
            label="Restart"
            size={14}
            onClick={() => {
              if (!activePath) return;
              void stopSession(pythonStop.id).then(() => startSession(activePath));
            }}
          />
          <IconButton
            icon={Square}
            label="Stop"
            size={14}
            className="debug-panel__stop-btn"
            onClick={() => {
              if (activeSession) void stopSession(activeSession.id);
            }}
          />
        </div>
      )}

      {pythonError && <p className="debug-panel__error">{pythonError}</p>}

      <div className="debug-panel__body">
        {/* Sessions section */}
        <section className="debug-panel__section">
          <button
            type="button"
            className="debug-panel__section-header"
            onClick={() => toggleSection("sessions")}
          >
            {openSections.sessions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Sessions</span>
            <span className="debug-panel__count">{sessions.length}</span>
          </button>
          {openSections.sessions && (
            <div className="debug-panel__section-content">
              {sessions.length === 0 ? (
                <p className="debug-panel__hint">No active debug sessions.</p>
              ) : (
                <ul className="debug-panel__list">
                  {sessions.map((session) => (
                    <li key={session.id} className="debug-panel__session-row">
                      <span
                        className={`debug-panel__status-dot ${session.running ? "debug-panel__status-dot--running" : ""}`}
                      />
                      <span className="debug-panel__session-label">{session.label}</span>
                      {session.running && (
                        <IconButton
                          icon={Square}
                          label="Stop session"
                          size={12}
                          className="debug-panel__stop-btn"
                          onClick={() => void stopSession(session.id)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Call Stack section */}
        {pythonStop && (
          <section className="debug-panel__section">
            <button
              type="button"
              className="debug-panel__section-header"
              onClick={() => toggleSection("stack")}
            >
              {openSections.stack ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Call Stack</span>
              <span className="debug-panel__count">{pythonStop.frames.length}</span>
            </button>
            {openSections.stack && (
              <div className="debug-panel__section-content">
                {pythonStop.frames.length === 0 ? (
                  <p className="debug-panel__hint">
                    {pythonStop.event === "exited" ? "Program finished." : "No frames."}
                  </p>
                ) : (
                  <ul className="debug-panel__list">
                    {pythonStop.frames.map((frame, idx) => (
                      <li key={`${frame.file}:${frame.line}:${frame.name}:${idx}`}>
                        <button
                          type="button"
                          className="debug-panel__stack-row"
                          onClick={() => void openFileAt(frame.file, frame.line, 1)}
                        >
                          <span className="debug-panel__frame-name">{frame.name}</span>
                          <span className="debug-panel__frame-loc">
                            {basename(frame.file)}:{frame.line}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {/* Variables section */}
        {pythonStop && (
          <section className="debug-panel__section">
            <button
              type="button"
              className="debug-panel__section-header"
              onClick={() => toggleSection("variables")}
            >
              {openSections.variables ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Variables</span>
              <span className="debug-panel__count">
                {Object.keys(pythonStop.locals).length}
              </span>
            </button>
            {openSections.variables && (
              <div className="debug-panel__section-content">
                {Object.keys(pythonStop.locals).length === 0 ? (
                  <p className="debug-panel__hint">No local variables.</p>
                ) : (
                  <ul className="debug-panel__list">
                    {Object.entries(pythonStop.locals).map(([name, value]) => (
                      <li key={name} className="debug-panel__var-row">
                        <span className="debug-panel__var-name">{name}:</span>
                        <span className="debug-panel__var-val">{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {/* Breakpoints section */}
        <section className="debug-panel__section">
          <button
            type="button"
            className="debug-panel__section-header"
            onClick={() => toggleSection("breakpoints")}
          >
            {openSections.breakpoints ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Breakpoints</span>
            <span className="debug-panel__count">{breakpoints.length}</span>
          </button>
          {openSections.breakpoints && (
            <div className="debug-panel__section-content">
              {breakpoints.length === 0 ? (
                <p className="debug-panel__hint">
                  Click a line number gutter in the editor to set a breakpoint.
                </p>
              ) : (
                <ul className="debug-panel__list">
                  {breakpoints.map((bp) => (
                    <li key={bp.id} className="debug-panel__bp-row">
                      <label className="debug-panel__bp-toggle">
                        <input
                          type="checkbox"
                          checked={bp.enabled}
                          onChange={() => toggleBreakpoint(bp.id)}
                        />
                        <span className="debug-panel__bp-dot" />
                      </label>
                      <button
                        type="button"
                        className="debug-panel__bp-link"
                        onClick={() => void openFileAt(bp.path, bp.line, 1)}
                      >
                        <span className="debug-panel__bp-name">{basename(bp.path)}</span>
                        <span className="debug-panel__bp-loc">Ln {bp.line}</span>
                      </button>
                      <IconButton
                        icon={Trash2}
                        label="Remove breakpoint"
                        size={12}
                        onClick={() => removeBreakpoint(bp.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
