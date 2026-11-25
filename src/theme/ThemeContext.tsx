import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ExtraTheme } from "../extensions/contributions";

export type ThemeMode = "dark" | "light";

type ThemeState = {
  theme: string;
  extras: ExtraTheme[];
  setTheme: (theme: string) => void;
  setExtras: (themes: ExtraTheme[]) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "t3d.theme";
const ThemeContext = createContext<ThemeState | null>(null);

function readStoredTheme(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "gruvbox" || value === "catppuccin") {
      return value;
    }
    if (value?.startsWith("ext:") && value.length > 4) return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function chromeTheme(theme: string, extras: ExtraTheme[]): string {
  if (theme === "light" || theme === "dark" || theme === "gruvbox" || theme === "catppuccin") {
    return theme;
  }
  const extra = extras.find((item) => `ext:${item.id}` === theme);
  return extra?.mode === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(() => readStoredTheme());
  const [extras, setExtrasState] = useState<ExtraTheme[]>([]);
  const [extrasReady, setExtrasReady] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", chromeTheme(theme, extras));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, extras]);

  useEffect(() => {
    if (!extrasReady) return;
    if (theme.startsWith("ext:") && !extras.some((item) => `ext:${item.id}` === theme)) {
      setThemeState("dark");
    }
  }, [extras, extrasReady, theme]);

  const setTheme = useCallback((next: string) => {
    setThemeState(next);
  }, []);

  const setExtras = useCallback((next: ExtraTheme[]) => {
    setExtrasState(next);
    setExtrasReady(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, extras, setTheme, setExtras, toggleTheme }),
    [theme, extras, setTheme, setExtras, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
