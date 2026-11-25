import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPanel.css";

type Props = {
  open: boolean;
  embedded?: boolean;
};

type ShellChoice = "" | "powershell" | "cmd" | "bash";

type SessionProps = {
  active: boolean;
  cwd: string | null;
  theme: "light" | "dark";
  shell: ShellChoice;
};

function TerminalSession({ active, cwd, theme, shell }: SessionProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hostRef.current || termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: 13,
      theme:
        theme === "light"
          ? {
              background: "#ffffff",
              foreground: "#1a1a1a",
              cursor: "#1a1a1a",
            }
          : {
              background: "#141414",
              foreground: "#e8e8e8",
              cursor: "#e8e8e8",
            },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    let unlistenData: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let disposed = false;

    const start = async () => {
      const id = await invoke<string>("pty_spawn", {
        cwd,
        cols: term.cols,
        rows: term.rows,
        shell: shell || null,
      });
      if (disposed) {
        await invoke("pty_kill", { id });
        return;
      }
      ptyIdRef.current = id;

      unlistenData = await listen<{ id: string; data: string }>("pty-data", (event) => {
        if (event.payload.id === id) term.write(event.payload.data);
      });
      unlistenExit = await listen<{ id: string }>("pty-exit", (event) => {
        if (event.payload.id === id) {
          term.writeln("\r\n[process exited]");
          ptyIdRef.current = null;
        }
      });

      term.onData((data) => {
        const current = ptyIdRef.current;
        if (!current) return;
        void invoke("pty_write", { id: current, data });
      });
      term.onResize(({ cols, rows }) => {
        const current = ptyIdRef.current;
        if (!current) return;
        void invoke("pty_resize", { id: current, cols, rows });
      });
    };

    void start().catch((err) => {
      term.writeln(`Failed to start terminal: ${String(err)}`);
    });

    const observer = new ResizeObserver(() => {
      fit.fit();
    });
    observer.observe(hostRef.current);

    return () => {
      disposed = true;
      observer.disconnect();
      unlistenData?.();
      unlistenExit?.();
      const id = ptyIdRef.current;
      if (id) {
        void invoke("pty_kill", { id });
        ptyIdRef.current = null;
      }
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // One shell per session. A new tab creates a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => fitRef.current?.fit(), 30);
    return () => window.clearTimeout(id);
  }, [active]);

  return <div className="terminal-panel__body" ref={hostRef} />;
}

let nextSession = 1;

type TermSession = {
  id: number;
  shell: ShellChoice;
};

const SHELLS: { value: ShellChoice; label: string }[] = [
  { value: "", label: "Default" },
  { value: "powershell", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "bash", label: "bash" },
];

function shellLabel(shell: ShellChoice, index: number): string {
  if (!shell) return `Terminal ${index + 1}`;
  const named = SHELLS.find((item) => item.value === shell);
  return named ? named.label : `Terminal ${index + 1}`;
}

export function TerminalPanel({ open, embedded = false }: Props) {
  const { rootPath } = useWorkspace();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<TermSession[]>(() => [
    { id: nextSession, shell: "" },
  ]);
  const [activeId, setActiveId] = useState(sessions[0].id);
  const [nextShell, setNextShell] = useState<ShellChoice>("");

  const addSession = () => {
    nextSession += 1;
    const id = nextSession;
    setSessions((current) => [...current, { id, shell: nextShell }]);
    setActiveId(id);
  };

  const closeSession = (id: number) => {
    setSessions((current) => {
      const next = current.filter((item) => item.id !== id);
      if (next.length === 0) {
        nextSession += 1;
        setActiveId(nextSession);
        return [{ id: nextSession, shell: nextShell }];
      }
      setActiveId((active) => (active === id ? next[next.length - 1].id : active));
      return next;
    });
  };

  if (!open) return null;

  const chrome = (
    <>
      <div className="terminal-panel__sessions" role="tablist" aria-label="Terminals">
        {sessions.map((session, index) => (
          <span key={session.id} className="terminal-panel__session">
            <button
              type="button"
              role="tab"
              aria-selected={session.id === activeId}
              className={
                session.id === activeId
                  ? "terminal-panel__session-tab terminal-panel__session-tab--active"
                  : "terminal-panel__session-tab"
              }
              onClick={() => setActiveId(session.id)}
            >
              {shellLabel(session.shell, index)}
            </button>
            <button
              type="button"
              className="terminal-panel__session-close"
              aria-label={`Close terminal ${index + 1}`}
              onClick={() => closeSession(session.id)}
            >
              ×
            </button>
          </span>
        ))}
        <label className="terminal-panel__shell">
          <span className="terminal-panel__shell-label">New shell</span>
          <select
            value={nextShell}
            aria-label="Shell for the next terminal"
            onChange={(event) => setNextShell(event.target.value as ShellChoice)}
          >
            {SHELLS.map((item) => (
              <option key={item.value || "default"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="terminal-panel__session-add" onClick={addSession}>
          New
        </button>
      </div>
      <div className="terminal-panel__stack">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={
              session.id === activeId
                ? "terminal-panel__slot terminal-panel__slot--active"
                : "terminal-panel__slot"
            }
          >
            <TerminalSession
              active={open && session.id === activeId}
              cwd={rootPath}
              theme={theme}
              shell={session.shell}
            />
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="terminal-panel terminal-panel--embedded" aria-label="Terminal">
        {chrome}
      </div>
    );
  }

  return (
    <section className="terminal-panel island" aria-label="Terminal">
      {chrome}
    </section>
  );
}
