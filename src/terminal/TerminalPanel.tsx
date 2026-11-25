import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useAi } from "../ai/AiContext";
import { reduceTerminalInput } from "./terminalInput";
import { basename, parentPath, languageFromPath } from "../workspace/path";
import { setRunListener } from "./runFile";
import { resolveRunCommand } from "./runConfig";
import { commandLabel, finishCommandOutput, setCommandListener } from "./runCommand";
import { setClearAllTerminalsListener, setClearActiveTerminalListener } from "./clearAll";
import { setNewTerminalListener } from "./newTerminal";
import { setKillActiveTerminalListener } from "./killTerminal";
import { setDuplicateTerminalListener } from "./duplicateTerminal";
import { setFocusTerminalListener } from "./focusTerminal";
import { setRenameActiveTerminalListener } from "./renameTerminal";
import { setRestartActiveTerminalListener } from "./restartTerminal";
import { requestSplitTerminal, setSplitTerminalListener } from "./splitTerminal";
import { setFindTerminalListener } from "./findTerminal";
import { setScrollCommandListener } from "./scrollCommand";
import { resolveTerminalTheme } from "./terminalThemes";
import { TerminalFindWidget } from "./TerminalFindWidget";
import { appendLog } from "../logs/logBus";
import { useTheme } from "../theme/ThemeContext";
import { useSettings } from "../settings/SettingsContext";
import { IconButton } from "../ui/IconButton";
import { Ban, Columns2, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
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
  focus: () => void;
  find: () => void;
  scrollToPreviousCommand: () => void;
  scrollToNextCommand: () => void;
};

type SessionProps = {
  active: boolean;
  cwd: string | null;
  theme: "light" | "dark";
  terminalTheme?: string;
  shell: ShellChoice;
  fontSize: number;
  runPath: string | null;
  command: string | null;
  onCommandDone?: (text: string) => void;
  onControl: (control: TerminalControl | null) => void;
  onCwdChange?: (cwd: string) => void;
  onExitCode?: (code: number | null) => void;
};

function TerminalSession({
  active,
  cwd,
  theme,
  terminalTheme,
  shell,
  fontSize,
  runPath,
  command,
  onCommandDone,
  onControl,
  onCwdChange,
  onExitCode,
}: SessionProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const onControlRef = useRef(onControl);
  onControlRef.current = onControl;
  const onCommandDoneRef = useRef(onCommandDone);
  onCommandDoneRef.current = onCommandDone;
  const onCwdChangeRef = useRef(onCwdChange);
  onCwdChangeRef.current = onCwdChange;
  const onExitCodeRef = useRef(onExitCode);
  onExitCodeRef.current = onExitCode;
  const commandLinesRef = useRef<number[]>([]);
  const commandOutputRef = useRef("");
  const unmountTimerRef = useRef<number | null>(null);
  const lineRef = useRef("");
  const [findOpen, setFindOpen] = useState(false);
  const { send } = useAi();
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!hostRef.current || termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize,
      theme: resolveTerminalTheme(terminalTheme, theme),
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

    const osc7 = term.parser.registerOscHandler(7, (data) => {
      let path = data.trim();
      if (path.startsWith("file://")) {
        path = path.slice("file://".length);
        const slashIdx = path.indexOf("/");
        if (slashIdx >= 0) {
          path = path.slice(slashIdx);
        }
      }
      try {
        path = decodeURIComponent(path);
      } catch {
        /* keep path */
      }
      if (/^\/[a-zA-Z]:/.test(path)) {
        path = path.slice(1);
      }
      if (path) {
        onCwdChangeRef.current?.(path);
      }
      return true;
    });

    const osc633 = term.parser.registerOscHandler(633, (data) => {
      const parts = data.split(";");
      const code = parts[0];
      if (code === "B" || code === "C") {
        const line = term.buffer.active.baseY + term.buffer.active.cursorY;
        const list = commandLinesRef.current;
        if (list.length === 0 || list[list.length - 1] !== line) {
          list.push(line);
        }
      } else if (code === "D") {
        const exit = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
        onExitCodeRef.current?.(Number.isNaN(exit) ? null : exit);
      } else if (code === "P") {
        if (parts[1] && parts[1].startsWith("Cwd=")) {
          let p = parts[1].slice("Cwd=".length).trim();
          try {
            p = decodeURIComponent(p);
          } catch {
            /* keep */
          }
          if (p) onCwdChangeRef.current?.(p);
        }
      }
      return true;
    });

    const osc133 = term.parser.registerOscHandler(133, (data) => {
      const parts = data.split(";");
      const code = parts[0];
      if (code === "B" || code === "C") {
        const line = term.buffer.active.baseY + term.buffer.active.cursorY;
        const list = commandLinesRef.current;
        if (list.length === 0 || list[list.length - 1] !== line) {
          list.push(line);
        }
      } else if (code === "D") {
        const exit = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
        onExitCodeRef.current?.(Number.isNaN(exit) ? null : exit);
      }
      return true;
    });

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

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      if (event.key === "Escape") {
        if (term.hasSelection()) {
          term.clearSelection();
          event.preventDefault();
          return false;
        }
      }
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
        return false;
      }
      if (!mod || !event.shiftKey) return true;
      if (event.key.toLowerCase() === "c") {
        const selection = term.getSelection();
        if (selection) {
          void navigator.clipboard.writeText(selection);
          event.preventDefault();
          return false;
        }
      }
      if (event.key.toLowerCase() === "a") {
        term.selectAll();
        event.preventDefault();
        return false;
      }
      if (event.key.toLowerCase() === "v") {
        void navigator.clipboard.readText().then((text) => {
          if (!text) return;
          const current = ptyIdRef.current;
          if (!current) return;
          void invoke("pty_write", { id: current, data: text });
        });
        event.preventDefault();
        return false;
      }
      return true;
    });

    term.onData((data) => {
      const current = ptyIdRef.current;
      if (!current) return;
      const next = reduceTerminalInput(lineRef.current, data);
      lineRef.current = next.line;
      for (const action of next.actions) {
        if (action.type === "echo") term.write(action.text);
        else if (action.type === "erase-local") term.write("\b \b".repeat(action.count));
        else if (action.type === "write-pty") void invoke("pty_write", { id: current, data: action.data });
        else {
          void sendRef.current(action.prompt).then((reply) => {
            if (reply) term.writeln(reply);
          });
        }
      }
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
      focus: () => {
        term.focus();
      },
      find: () => {
        setFindOpen(true);
      },
      scrollToPreviousCommand: () => {
        const lines = commandLinesRef.current;
        if (lines.length === 0) return;
        const currentScroll = term.buffer.active.viewportY;
        const prev = [...lines].reverse().find((l) => l < currentScroll);
        if (prev !== undefined) {
          term.scrollToLine(prev);
        } else {
          term.scrollToLine(lines[0]);
        }
      },
      scrollToNextCommand: () => {
        const lines = commandLinesRef.current;
        if (lines.length === 0) return;
        const currentScroll = term.buffer.active.viewportY;
        const next = lines.find((l) => l > currentScroll);
        if (next !== undefined) {
          term.scrollToLine(next);
        } else {
          term.scrollToBottom();
        }
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
      osc7.dispose();
      osc633.dispose();
      osc133.dispose();
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

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontSize = fontSize;
    fitRef.current?.fit();
  }, [fontSize]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = resolveTerminalTheme(terminalTheme, theme);
  }, [terminalTheme, theme]);

  return (
    <>
      <div className="terminal-panel__body" ref={hostRef} />
      {findOpen && (
        <TerminalFindWidget
          term={termRef.current}
          onClose={() => {
            setFindOpen(false);
            termRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

let nextSession = 1;

type TermSession = {
  id: number;
  shell: ShellChoice;
  runPath: string | null;
  command: string | null;
  cwd: string | null;
  liveCwd?: string | null;
  lastExitCode?: number | null;
  title?: string;
};

const SHELLS: { value: ShellChoice; label: string }[] = [
  { value: "", label: "Default" },
  { value: "powershell", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "bash", label: "bash" },
];

function shellLabel(session: TermSession, index: number): string {
  if (session.title?.trim()) return session.title.trim();
  if (session.command) return commandLabel(session.command);
  if (session.runPath) return basename(session.runPath);
  const baseName = session.shell
    ? (SHELLS.find((item) => item.value === session.shell)?.label ?? `Terminal ${index + 1}`)
    : `Terminal ${index + 1}`;
  if (session.liveCwd) {
    return `${baseName} (${basename(session.liveCwd)})`;
  }
  return baseName;
}

export function TerminalPanel({ open, embedded = false }: Props) {
  const { rootPath } = useWorkspace();
  const { settings } = useSettings();
  const { theme, extras } = useTheme();
  const appearance = theme === "light" || (theme.startsWith("ext:") &&
    extras.find((item) => `ext:${item.id}` === theme)?.mode === "light")
    ? "light"
    : "dark";
  const terminalFontSize = settings.editor.terminalFontSize;
  const terminalTheme = settings.terminalTheme;
  const [sessions, setSessions] = useState<TermSession[]>(() => [
    { id: nextSession, shell: "", runPath: null, command: null, cwd: null },
  ]);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [activeId, setActiveId] = useState(sessions[0].id);
  const [splitPeerId, setSplitPeerId] = useState<number | null>(null);
  const [nextShell, setNextShell] = useState<ShellChoice>("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const controls = useRef(new Map<number, TerminalControl>());
  const commandDone = useRef(new Map<number, (text: string) => void>());

  const commitRename = (id: number) => {
    const title = renameDraft.trim();
    setSessions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, title: title || undefined } : item,
      ),
    );
    setRenamingId(null);
  };

  const focusSession = (id: number) => {
    if (id === activeId) return;
    if (id === splitPeerId) setSplitPeerId(activeId);
    setActiveId(id);
  };

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
        setSplitPeerId(null);
        return [{ id: nextSession, shell: nextShell, runPath: null, command: null, cwd: null }];
      }
      setActiveId((active) => (active === id ? next[next.length - 1].id : active));
      setSplitPeerId((peer) => {
        if (peer === id) return null;
        if (next.length < 2) return null;
        return peer;
      });
      return next;
    });
  };

  useEffect(() => {
    const clearAll = () => {
      for (const control of controls.current.values()) {
        void control.kill();
      }
      controls.current.clear();
      commandDone.current.clear();
      nextSession += 1;
      const id = nextSession;
      setSessions([{ id, shell: nextShell, runPath: null, command: null, cwd: null }]);
      setActiveId(id);
    };
    setClearAllTerminalsListener(clearAll);
    return () => setClearAllTerminalsListener(null);
  }, [nextShell]);

  useEffect(() => {
    const clearActive = () => {
      controls.current.get(activeId)?.clear();
    };
    setClearActiveTerminalListener(clearActive);
    return () => setClearActiveTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setNewTerminalListener(() => {
      nextSession += 1;
      const id = nextSession;
      setSessions((current) => [
        ...current,
        { id, shell: nextShell, runPath: null, command: null, cwd: null },
      ]);
      setActiveId(id);
    });
    return () => setNewTerminalListener(null);
  }, [nextShell]);

  useEffect(() => {
    setKillActiveTerminalListener(() => {
      void controls.current.get(activeId)?.kill();
    });
    return () => setKillActiveTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setDuplicateTerminalListener(() => {
      const current = sessionsRef.current.find((item) => item.id === activeId);
      const shell = current?.shell ?? nextShell;
      nextSession += 1;
      const id = nextSession;
      setSessions((sessions) => [
        ...sessions,
        { id, shell, runPath: null, command: null, cwd: current?.cwd ?? null },
      ]);
      setActiveId(id);
    });
    return () => setDuplicateTerminalListener(null);
  }, [activeId, nextShell]);

  useEffect(() => {
    setSplitTerminalListener(() => {
      const list = sessionsRef.current;
      if (splitPeerId != null) {
        setSplitPeerId(null);
        return;
      }
      if (list.length < 2) {
        const current = list.find((item) => item.id === activeId);
        nextSession += 1;
        const id = nextSession;
        setSessions((sessions) => [
          ...sessions,
          {
            id,
            shell: current?.shell ?? nextShell,
            runPath: null,
            command: null,
            cwd: current?.cwd ?? null,
          },
        ]);
        setSplitPeerId(id);
        return;
      }
      const idx = list.findIndex((item) => item.id === activeId);
      const peer = list[(idx + 1) % list.length];
      if (peer) setSplitPeerId(peer.id);
    });
    return () => setSplitTerminalListener(null);
  }, [activeId, nextShell, splitPeerId]);

  useEffect(() => {
    setFocusTerminalListener((mode) => {
      const list = sessionsRef.current;
      if (list.length === 0) return;
      if (mode === "active") {
        window.setTimeout(() => controls.current.get(activeId)?.focus(), 40);
        return;
      }
      const idx = list.findIndex((item) => item.id === activeId);
      if (idx < 0) return;
      const nextIdx =
        mode === "next"
          ? (idx + 1) % list.length
          : (idx - 1 + list.length) % list.length;
      const next = list[nextIdx];
      if (next) setActiveId(next.id);
    });
    return () => setFocusTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setRenameActiveTerminalListener(() => {
      const list = sessionsRef.current;
      const idx = list.findIndex((item) => item.id === activeId);
      const session = idx >= 0 ? list[idx] : null;
      if (!session) return;
      setRenamingId(session.id);
      setRenameDraft(shellLabel(session, idx >= 0 ? idx : 0));
    });
    return () => setRenameActiveTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setRestartActiveTerminalListener(() => {
      void controls.current.get(activeId)?.restart();
    });
    return () => setRestartActiveTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setFindTerminalListener(() => {
      controls.current.get(activeId)?.find();
    });
    return () => setFindTerminalListener(null);
  }, [activeId]);

  useEffect(() => {
    setScrollCommandListener((direction) => {
      const ctrl = controls.current.get(activeId);
      if (direction === "previous") ctrl?.scrollToPreviousCommand();
      else ctrl?.scrollToNextCommand();
    });
    return () => setScrollCommandListener(null);
  }, [activeId]);

  useEffect(() => {
    setRunListener((path) => {
      const override = resolveRunCommand(languageFromPath(path), path);
      if (override) {
        nextSession += 1;
        const id = nextSession;
        setSessions((current) => [
          ...current,
          {
            id,
            shell: "",
            runPath: null,
            command: override,
            cwd: parentPath(path),
          },
        ]);
        setActiveId(id);
        return;
      }
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
      <div className="terminal-panel__toolbar">
        <div className="terminal-panel__sessions" role="tablist" aria-label="Terminals">
          {sessions.map((session, index) => (
            <span key={session.id} className="terminal-panel__session">
              {renamingId === session.id ? (
                <input
                  className="terminal-panel__session-rename"
                  value={renameDraft}
                  autoFocus
                  aria-label="Rename terminal"
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={() => commitRename(session.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRename(session.id);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      setRenamingId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={session.id === activeId}
                  className={
                    session.id === activeId
                      ? "terminal-panel__session-tab terminal-panel__session-tab--active"
                      : "terminal-panel__session-tab"
                  }
                  onClick={() => focusSession(session.id)}
                  onDoubleClick={() => {
                    setRenamingId(session.id);
                    setRenameDraft(shellLabel(session, index));
                  }}
                  title={`${shellLabel(session, index)}${session.liveCwd ? `\nDirectory: ${session.liveCwd}` : ""}${session.lastExitCode != null ? `\nExit code: ${session.lastExitCode}` : ""}\nDouble-click to rename`}
                >
                  {shellLabel(session, index)}
                  {session.lastExitCode != null && session.lastExitCode !== 0 && (
                    <span
                      className="terminal-panel__exit-badge"
                      title={`Command failed with exit code ${session.lastExitCode}`}
                    >
                      !
                    </span>
                  )}
                </button>
              )}
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
          <IconButton
            icon={Plus}
            label="New terminal"
            size={13}
            onClick={addSession}
          />
          <IconButton
            icon={Columns2}
            label={splitPeerId != null ? "Unsplit terminal" : "Split terminal"}
            size={13}
            active={splitPeerId != null}
            onClick={requestSplitTerminal}
          />
        </div>

        <div className="terminal-panel__actions">
          <label className="terminal-panel__shell" title="Default shell for new terminals">
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
          <IconButton
            icon={Search}
            label="Find in terminal (Ctrl+F)"
            size={13}
            onClick={() => controls.current.get(activeId)?.find()}
          />
          <IconButton
            icon={RotateCcw}
            label="Restart terminal"
            size={13}
            onClick={() => void controls.current.get(activeId)?.restart()}
          />
          <IconButton
            icon={Ban}
            label="Clear terminal"
            size={13}
            onClick={() => controls.current.get(activeId)?.clear()}
          />
          <IconButton
            icon={Trash2}
            label="Kill active terminal"
            size={13}
            onClick={() => void controls.current.get(activeId)?.kill()}
          />
        </div>
      </div>
      <div
        className={
          splitPeerId != null
            ? "terminal-panel__stack terminal-panel__stack--split"
            : "terminal-panel__stack"
        }
      >
        {sessions.map((session) => {
          const visible =
            session.id === activeId ||
            (splitPeerId != null && session.id === splitPeerId);
          return (
          <div
            key={session.id}
            className={
              visible
                ? "terminal-panel__slot terminal-panel__slot--active"
                : "terminal-panel__slot"
            }
            onMouseDown={() => focusSession(session.id)}
          >
            <TerminalSession
              active={open && visible}
              cwd={session.cwd ?? rootPath}
              theme={appearance}
              terminalTheme={terminalTheme}
              shell={session.shell}
              fontSize={terminalFontSize}
              runPath={session.runPath}
              command={session.command}
              onCwdChange={(newCwd) => {
                setSessions((current) =>
                  current.map((item) =>
                    item.id === session.id ? { ...item, liveCwd: newCwd } : item,
                  ),
                );
              }}
              onExitCode={(exitCode) => {
                setSessions((current) =>
                  current.map((item) =>
                    item.id === session.id ? { ...item, lastExitCode: exitCode } : item,
                  ),
                );
              }}
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
          );
        })}
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
