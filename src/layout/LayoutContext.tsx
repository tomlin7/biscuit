import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "t3d.layout.v1";

type LayoutPersisted = {
  sidebarWidth: number;
  aiWidth: number;
  bottomHeight: number;
  sidebarOpen: boolean;
  aiOpen: boolean;
  bottomOpen: boolean;
};

type LayoutState = LayoutPersisted & {
  setSidebarWidth: (n: number) => void;
  setAiWidth: (n: number) => void;
  setBottomHeight: (n: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAi: () => void;
  setAiOpen: (open: boolean) => void;
  toggleBottom: () => void;
  setBottomOpen: (open: boolean) => void;
};

const DEFAULTS: LayoutPersisted = {
  sidebarWidth: 280,
  aiWidth: 340,
  bottomHeight: 220,
  sidebarOpen: true,
  aiOpen: true,
  bottomOpen: false,
};

const LayoutContext = createContext<LayoutState | null>(null);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function load(): LayoutPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LayoutPersisted>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const setSidebarWidth = useCallback((n: number) => {
    setState((s) => ({ ...s, sidebarWidth: clamp(n, 180, 520) }));
  }, []);
  const setAiWidth = useCallback((n: number) => {
    setState((s) => ({ ...s, aiWidth: clamp(n, 260, 560) }));
  }, []);
  const setBottomHeight = useCallback((n: number) => {
    setState((s) => ({ ...s, bottomHeight: clamp(n, 120, 480) }));
  }, []);
  const toggleSidebar = useCallback(() => {
    setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  }, []);
  const setSidebarOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, sidebarOpen: open }));
  }, []);
  const toggleAi = useCallback(() => {
    setState((s) => ({ ...s, aiOpen: !s.aiOpen }));
  }, []);
  const setAiOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, aiOpen: open }));
  }, []);
  const toggleBottom = useCallback(() => {
    setState((s) => ({ ...s, bottomOpen: !s.bottomOpen }));
  }, []);
  const setBottomOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, bottomOpen: open }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setSidebarWidth,
      setAiWidth,
      setBottomHeight,
      toggleSidebar,
      setSidebarOpen,
      toggleAi,
      setAiOpen,
      toggleBottom,
      setBottomOpen,
    }),
    [
      state,
      setSidebarWidth,
      setAiWidth,
      setBottomHeight,
      toggleSidebar,
      setSidebarOpen,
      toggleAi,
      setAiOpen,
      toggleBottom,
      setBottomOpen,
    ],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutState {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
