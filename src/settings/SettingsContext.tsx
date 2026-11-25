import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type EditorSettings = {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  /** Preferred wrap column when word wrap is on. */
  wordWrapColumn: number;
  /** Comma-separated ruler columns; empty disables. */
  rulers: string;
  minimap: boolean;
  lineNumbers: boolean;
  stickyScroll: boolean;
  /** 0 = off; otherwise idle milliseconds before auto-save. */
  autoSaveMs: number;
};

export type AppSettings = {
  editor: EditorSettings;
};

type SettingsState = {
  settings: AppSettings;
  updateEditor: (patch: Partial<EditorSettings>) => void;
  reset: () => void;
};

const STORAGE_KEY = "t3d.settings.v1";

const DEFAULTS: AppSettings = {
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: false,
    wordWrapColumn: 80,
    rulers: "",
    minimap: true,
    lineNumbers: true,
    stickyScroll: true,
    autoSaveMs: 0,
  },
};

const SettingsContext = createContext<SettingsState | null>(null);

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      editor: { ...DEFAULTS.editor, ...parsed.editor },
    };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const updateEditor = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((s) => ({
      ...s,
      editor: { ...s.editor, ...patch },
    }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const value = useMemo(
    () => ({ settings, updateEditor, reset }),
    [settings, updateEditor, reset],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
