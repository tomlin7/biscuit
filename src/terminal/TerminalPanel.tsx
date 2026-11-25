import { useEffect, useRef } from "react";
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
};

export function TerminalPanel({ open }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const { rootPath } = useWorkspace();
  const { theme } = useTheme();

  useEffect(() => {
    if (!open || !hostRef.current || termRef.current) return;

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
              background: "#121212",
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
      const cols = term.cols;
      const rows = term.rows;
      const id = await invoke<string>("pty_spawn", {
        cwd: rootPath,
        cols,
        rows,
      });
      if (disposed) {
        await invoke("pty_kill", { id });
        return;
      }
      ptyIdRef.current = id;

      unlistenData = await listen<{ id: string; data: string }>("pty-data", (event) => {
        if (event.payload.id === id) {
          term.write(event.payload.data);
        }
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

      term.onResize(({ cols: c, rows: r }) => {
        const current = ptyIdRef.current;
        if (!current) return;
        void invoke("pty_resize", { id: current, cols: c, rows: r });
      });
    };

    void start().catch((err) => {
      term.writeln(`Failed to start terminal: ${String(err)}`);
    });

    const onWinResize = () => {
      fit.fit();
    };
    window.addEventListener("resize", onWinResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onWinResize);
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
    // Recreate terminal when panel first opens; theme applied on next open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => fitRef.current?.fit(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  return (
    <section className="terminal-panel island" aria-label="Terminal">
      <div className="terminal-panel__header">
        <span>Terminal</span>
      </div>
      <div className="terminal-panel__body" ref={hostRef} />
    </section>
  );
}
