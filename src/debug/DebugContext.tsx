import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { appendLog } from "../logs/logBus";

export type Breakpoint = {
  id: string;
  path: string;
  line: number;
  enabled: boolean;
};

export type DebugSession = {
  id: string;
  label: string;
  running: boolean;
};

export type PyFrame = {
  name: string;
  file: string;
  line: number;
};

export type PyStop = {
  id: string;
  event: string;
  frames: PyFrame[];
  locals: Record<string, string>;
};

type DebugState = {
  breakpoints: Breakpoint[];
  sessions: DebugSession[];
  addBreakpoint: (path: string, line: number) => void;
  removeBreakpoint: (id: string) => void;
  toggleBreakpoint: (id: string) => void;
  startSession: (path: string) => Promise<void>;
  stopSession: (id: string) => Promise<void>;
  pythonStop: PyStop | null;
  pythonError: string | null;
};

const DebugContext = createContext<DebugState | null>(null);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [pythonStop, setPythonStop] = useState<PyStop | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const breakpointsRef = useRef(breakpoints);
  breakpointsRef.current = breakpoints;

  const addBreakpoint = useCallback((path: string, line: number) => {
    setBreakpoints((current) => {
      if (current.some((bp) => bp.path === path && bp.line === line)) {
        return current;
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          path,
          line,
          enabled: true,
        },
      ];
    });
  }, []);

  const removeBreakpoint = useCallback((id: string) => {
    setBreakpoints((current) => current.filter((bp) => bp.id !== id));
  }, []);

  const toggleBreakpoint = useCallback((id: string) => {
    setBreakpoints((current) =>
      current.map((bp) =>
        bp.id === id ? { ...bp, enabled: !bp.enabled } : bp,
      ),
    );
  }, []);

  const startSession = useCallback(async (path: string) => {
    setPythonError(null);
    try {
      if (path.toLowerCase().endsWith(".py")) {
        const fileKey = path.replace(/\\/g, "/").toLowerCase();
        const hits = breakpointsRef.current.filter(
          (bp) => bp.enabled && bp.path.replace(/\\/g, "/").toLowerCase() === fileKey,
        );
        const stop = await invoke<PyStop>("debug_py_start", {
          path,
          breakpoints: hits.map((bp) => ({ file: bp.path, line: bp.line })),
        });
        setPythonStop(stop);
        setSessions((current) => [
          ...current,
          { id: stop.id, label: path, running: stop.event === "stopped" },
        ]);
        return;
      }
      const id = await invoke<string>("debug_launch", { path });
      setSessions((current) => [
        ...current,
        { id, label: path, running: true },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPythonError(message);
      appendLog(`Debug launch failed: ${message}`);
    }
  }, []);

  const stopSession = useCallback(async (id: string) => {
    await invoke("debug_stop", { id });
    setSessions((current) =>
      current.map((s) => (s.id === id ? { ...s, running: false } : s)),
    );
  }, []);

  const value = useMemo(
    () => ({
      breakpoints,
      sessions,
      addBreakpoint,
      removeBreakpoint,
      toggleBreakpoint,
      startSession,
      stopSession,
      pythonStop,
      pythonError,
    }),
    [
      breakpoints,
      sessions,
      addBreakpoint,
      removeBreakpoint,
      toggleBreakpoint,
      startSession,
      stopSession,
      pythonStop,
      pythonError,
    ],
  );

  return (
    <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
  );
}

export function useDebug(): DebugState {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error("useDebug must be used within DebugProvider");
  return ctx;
}
