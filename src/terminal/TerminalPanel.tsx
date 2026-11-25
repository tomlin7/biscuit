import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { basename } from "../workspace/path";
import { setRunListener } from "./runFile";
import { commandLabel, finishCommandOutput, setCommandListener } from "./runCommand";
import { appendLog } from "../logs/logBus";
import { useTheme } from "../theme/ThemeContext";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPanel.css";

type Props = {
  open: boolean;
  embedded?: boolean;
};

type ShellChoice = "" | "powershell" | "cmd" | "bash";

type TerminalControl = {
  kill: () => Promise<void>;
  restart: () => Promise<void>;
  clear: () => void;
};

type SessionProps = {
  active: boolean;
  cwd: string | null;
  theme: "light" | "dark";
  shell: ShellChoice;
  runPath: string | null;
  command: string | null;
  onCommandDone?: (text: string) => void;
  onControl: (control: TerminalControl | null) => void;
};

function TerminalSession({
  active,
  cwd,
  theme,
  shell,
  runPath,
  command,
  onCommandDone,
  onControl,
}: SessionProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const onControlRef = useRef(onControl);
  onControlRef.current = onControl;
  const onCommandDoneRef = useRef(onCommandDone);
  onCommandDoneRef.current = onCommandDone;
  const commandOutputRef = useRef("");
  const unmountTimerRef = useRef<number | null>(null);

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

    if (unmountTimerRef.current) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    commandOutputRef.current = "";

    let unlistenData: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let disposed = false;

    let settled = false;
    const finishCommand = (stillRunning: boolean) => {
      if (!command || settled) return;
      settled = true;
      onCommandDoneRef.current?.(finishCommandOutput(commandOutputRef.current, stillRunning));
    };

    const spawn = async () => {
      try {
        const id = await invoke<string>(
          command ? "pty_exec" : runPath ? "pty_run_file" : "pty_spawn",
          command
            ? { command, cwd, cols: term.cols, rows: term.rows }
            : runPath
              ? { path: runPath, cols: term.cols, rows: term.rows }
              : { cwd, cols: term.cols, rows: term.rows, shell: shell || null },
        );
        if (disposed) {
          await invoke("pty_kill", { id });
          return;
        }
        ptyIdRef.current = id;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        term.writeln(`Failed to start terminal: ${message}`);
        appendLog(`Terminal failed: ${message}`);
        commandOutputRef.current = message;
        finishCommand(false);
      }
    };

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

    void listen<{ id: string; data: string }>("pty-data", (event) => {
      if (event.payload.id !== ptyIdRef.current) return;
      term.write(event.payload.data);
      if (command) commandOutputRef.current += event.payload.data;
    }).then((stop) => {
      if (disposed) stop();
      else unlistenData = stop;
    });
    void listen<{ id: string }>("pty-exit", (event) => {
      if (event.payload.id !== ptyIdRef.current) return;
      term.writeln("\r\n[process exited]");
      ptyIdRef.current = null;
      finishCommand(false);
    }).then((stop) => {
      if (disposed) stop();
      else unlistenExit = stop;
    });

    onControlRef.current({
      kill: async () => {
        const id = ptyIdRef.current;
        if (!id) return;
        await invoke("pty_kill", { id });
      },
      restart: async () => {
        const old = ptyIdRef.current;
        ptyIdRef.current = null;
        if (old) await invoke("pty_kill", { id: old });
        await spawn();
      },
      clear: () => {
        term.clear();
      },
    });

    void spawn();
    const commandTimer = command ? window.setTimeout(() => finishCommand(true), 15_000) : 0;

    const observer = new ResizeObserver(() => {
      fit.fit();
    });
    observer.observe(hostRef.current);

    return () => {
      disposed = true;
      if (commandTimer) window.clearTimeout(commandTimer);
      unmountTimerRef.current = window.setTimeout(() => finishCommand(true), 100);
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
      onControlRef.current(null);
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
  runPath: string | null;
  command: string | null;
  cwd: string | null;
};

const SHELLS: { value: ShellChoice; label: string }[] = [
  { value: "", label: "Default" },
  { value: "powershell", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "bash", label: "bash" },
];

function shellLabel(session: TermSession, index: number): string {
  if (session.command) return commandLabel(session.command);
  if (session.runPath) return basename(session.runPath);
  if (!session.shell) return `Terminal ${index + 1}`;
  const named = SHELLS.find((item) => item.value === session.shell);
  return named ? named.label : `Terminal ${index + 1}`;
}

export function TerminalPanel({ open, embedded = false }: Props) {
  const { rootPath } = useWorkspace();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<TermSession[]>(() => [
    { id: nextSession, shell: "", runPath: null, command: null, cwd: null },
  ]);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [activeId, setActiveId] = useState(sessions[0].id);
  const [nextShell, setNextShell] = useState<ShellChoice>("");
  const controls = useRef(new Map<number, TerminalControl>());
  const commandDone = useRef(new Map<number, (text: string) => void>());

  const addSession = () => {
    nextSession += 1;
    const id = nextSession;
    setSessions((current) => [
      ...current,
      { id, shell: nextShell, runPath: null, command: null, cwd: null },
    ]);
    setActiveId(id);
  };

  const closeSession = (id: number) => {
    setSessions((current) => {
      const next = current.filter((item) => item.id !== id);
      if (next.length === 0) {
        nextSession += 1;
        setActiveId(nextSession);
        return [{ id: nextSession, shell: nextShell, runPath: null, command: null, cwd: null }];
      }
      setActiveId((active) => (active === id ? next[next.length - 1].id : active));
      return next;
    });
  };

  useEffect(() => {
    setRunListener((path) => {
      const existing = sessionsRef.current.find((item) => item.runPath === path);
      if (existing) {
        setActiveId(existing.id);
        void controls.current.get(existing.id)?.restart();
        return;
      }
      nextSession += 1;
      const id = nextSession;
      setSessions((current) => [
        ...current,
        { id, shell: "", runPath: path, command: null, cwd: null },
      ]);
      setActiveId(id);
    });
    setCommandListener((request, done) => {
      nextSession += 1;
      const id = nextSession;
      setSessions((current) => [
        ...current,
        { id, shell: "", runPath: null, command: request.command, cwd: request.cwd },
      ]);
      setActiveId(id);
      commandDone.current.set(id, done);
    });
    return () => {
      setRunListener(null);
      setCommandListener(null);
    };
  }, []);

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
              {shellLabel(session, index)}
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
        <button
          type="button"
          className="terminal-panel__session-add"
          onClick={() => void controls.current.get(activeId)?.kill()}
        >
          Kill
        </button>
        <button
          type="button"
          className="terminal-panel__session-add"
          onClick={() => void controls.current.get(activeId)?.restart()}
        >
          Restart
        </button>
        <button
          type="button"
          className="terminal-panel__session-add"
          onClick={() => controls.current.get(activeId)?.clear()}
        >
          Clear
        </button>
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
              cwd={session.cwd ?? rootPath}
              theme={theme}
              shell={session.shell}
              runPath={session.runPath}
              command={session.command}
              onCommandDone={
                session.command
                  ? (text) => {
                      const done = commandDone.current.get(session.id);
                      commandDone.current.delete(session.id);
                      done?.(text);
                    }
                  : undefined
              }
              onControl={(control) => {
                if (control) controls.current.set(session.id, control);
                else controls.current.delete(session.id);
              }}
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
