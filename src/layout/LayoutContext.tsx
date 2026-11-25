import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BUILTIN_LAYOUT_PRESETS,
  clamp,
  createPreset,
  findPreset,
  loadPresetsFromStorage,
  MAX_AI_WIDTH,
  MAX_BOTTOM_HEIGHT,
  MAX_SIDEBAR_WIDTH,
  MIN_AI_WIDTH,
  MIN_BOTTOM_HEIGHT,
  MIN_SIDEBAR_WIDTH,
  saveCustomPresetsToStorage,
  type LayoutPreset,
} from "./layoutPresets";

const STORAGE_KEY = "t3d.layout.v1";

type LayoutPersisted = {
  sidebarWidth: number;
  aiWidth: number;
  bottomHeight: number;
  sidebarOpen: boolean;
  aiOpen: boolean;
  bottomOpen: boolean;
  activePresetId?: string | null;
};

export type LayoutState = LayoutPersisted & {
  presets: LayoutPreset[];
  activePresetId: string | null;
  setSidebarWidth: (n: number) => void;
  setAiWidth: (n: number) => void;
  setBottomHeight: (n: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAi: () => void;
  setAiOpen: (open: boolean) => void;
  toggleBottom: () => void;
  setBottomOpen: (open: boolean) => void;
  applyPreset: (presetIdOrName: string) => boolean;
  saveCurrentAsPreset: (name: string) => LayoutPreset;
  deletePreset: (presetId: string) => boolean;
  resetPresets: () => void;
};

const DEFAULTS: LayoutPersisted = {
  sidebarWidth: 280,
  aiWidth: 340,
  bottomHeight: 220,
  sidebarOpen: true,
  aiOpen: true,
  bottomOpen: false,
  activePresetId: null,
};

const LayoutContext = createContext<LayoutState | null>(null);

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
  const [presets, setPresets] = useState<LayoutPreset[]>(() => {
    if (typeof window !== "undefined") {
      return loadPresetsFromStorage(window.localStorage);
    }
    return [...BUILTIN_LAYOUT_PRESETS];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const setSidebarWidth = useCallback((n: number) => {
    setState((s) => ({ ...s, sidebarWidth: clamp(n, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH) }));
  }, []);
  const setAiWidth = useCallback((n: number) => {
    setState((s) => ({ ...s, aiWidth: clamp(n, MIN_AI_WIDTH, MAX_AI_WIDTH) }));
  }, []);
  const setBottomHeight = useCallback((n: number) => {
    setState((s) => ({ ...s, bottomHeight: clamp(n, MIN_BOTTOM_HEIGHT, MAX_BOTTOM_HEIGHT) }));
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

  const applyPreset = useCallback(
    (presetIdOrName: string): boolean => {
      const found = findPreset(presetIdOrName, presets);
      if (!found) return false;
      setState((s) => ({
        ...s,
        sidebarWidth: clamp(found.values.sidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
        sidebarOpen: found.values.sidebarOpen,
        bottomHeight: clamp(found.values.bottomHeight, MIN_BOTTOM_HEIGHT, MAX_BOTTOM_HEIGHT),
        bottomOpen: found.values.bottomOpen,
        aiWidth: clamp(found.values.aiWidth, MIN_AI_WIDTH, MAX_AI_WIDTH),
        aiOpen: found.values.aiOpen,
        activePresetId: found.id,
      }));
      return true;
    },
    [presets],
  );

  const saveCurrentAsPreset = useCallback(
    (name: string): LayoutPreset => {
      const preset = createPreset(name, {
        sidebarWidth: state.sidebarWidth,
        sidebarOpen: state.sidebarOpen,
        bottomHeight: state.bottomHeight,
        bottomOpen: state.bottomOpen,
        aiWidth: state.aiWidth,
        aiOpen: state.aiOpen,
      });

      setPresets((prev) => {
        const existingIndex = prev.findIndex((p) => p.id === preset.id);
        let next: LayoutPreset[];
        if (existingIndex >= 0) {
          next = [...prev];
          next[existingIndex] = preset;
        } else {
          next = [...prev, preset];
        }
        if (typeof window !== "undefined") {
          saveCustomPresetsToStorage(window.localStorage, next);
        }
        return next;
      });

      setState((s) => ({ ...s, activePresetId: preset.id }));
      return preset;
    },
    [state],
  );

  const deletePreset = useCallback(
    (presetId: string): boolean => {
      const target = findPreset(presetId, presets);
      if (!target || target.isBuiltin) return false;

      setPresets((prev) => {
        const next = prev.filter((p) => p.id !== target.id);
        if (typeof window !== "undefined") {
          saveCustomPresetsToStorage(window.localStorage, next);
        }
        return next;
      });

      setState((s) => (s.activePresetId === target.id ? { ...s, activePresetId: null } : s));
      return true;
    },
    [presets],
  );

  const resetPresets = useCallback(() => {
    setPresets([...BUILTIN_LAYOUT_PRESETS]);
    if (typeof window !== "undefined") {
      saveCustomPresetsToStorage(window.localStorage, [...BUILTIN_LAYOUT_PRESETS]);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      activePresetId: state.activePresetId ?? null,
      presets,
      setSidebarWidth,
      setAiWidth,
      setBottomHeight,
      toggleSidebar,
      setSidebarOpen,
      toggleAi,
      setAiOpen,
      toggleBottom,
      setBottomOpen,
      applyPreset,
      saveCurrentAsPreset,
      deletePreset,
      resetPresets,
    }),
    [
      state,
      presets,
      setSidebarWidth,
      setAiWidth,
      setBottomHeight,
      toggleSidebar,
      setSidebarOpen,
      toggleAi,
      setAiOpen,
      toggleBottom,
      setBottomOpen,
      applyPreset,
      saveCurrentAsPreset,
      deletePreset,
      resetPresets,
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
