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
import {
  type CustomThemeDefinition,
  CUSTOM_THEMES_STORAGE_KEY,
  loadCustomThemes,
  saveCustomTheme as persistCustomTheme,
  deleteCustomTheme as removeCustomTheme,
  getCustomTheme,
  exportCustomThemeJson,
  importCustomThemeFromJson,
  applyCustomThemeCss,
} from "./customTheme";

export type ThemeMode = "dark" | "light";

export type ThemeState = {
  theme: string;
  extras: ExtraTheme[];
  customThemes: CustomThemeDefinition[];
  setTheme: (theme: string) => void;
  setExtras: (themes: ExtraTheme[]) => void;
  toggleTheme: () => void;
  saveCustomTheme: (theme: CustomThemeDefinition) => void;
  deleteCustomTheme: (id: string) => void;
  importCustomTheme: (json: string) => CustomThemeDefinition;
  exportCustomTheme: (id: string) => string;
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
    if (value?.startsWith("custom:") && value.length > 7) return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function chromeTheme(
  theme: string,
  extras: ExtraTheme[] = [],
  customThemes: CustomThemeDefinition[] = []
): string {
  if (theme === "light" || theme === "dark" || theme === "gruvbox" || theme === "catppuccin") {
    return theme;
  }
  if (theme.startsWith("custom:")) {
    const customId = theme.slice(7);
    const custom = customThemes.find((item) => item.id === customId) ?? getCustomTheme(customId);
    return custom?.uiTheme === "vs" ? "light" : "dark";
  }
  const extra = extras.find((item) => `ext:${item.id}` === theme);
  return extra?.mode === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(() => readStoredTheme());
  const [extras, setExtrasState] = useState<ExtraTheme[]>([]);
  const [customThemes, setCustomThemesState] = useState<CustomThemeDefinition[]>(() =>
    loadCustomThemes()
  );
  const [extrasReady, setExtrasReady] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      chromeTheme(theme, extras, customThemes)
    );
    if (theme.startsWith("custom:")) {
      const customId = theme.slice(7);
      const custom = customThemes.find((t) => t.id === customId) ?? getCustomTheme(customId);
      applyCustomThemeCss(custom || null);
    } else {
      applyCustomThemeCss(null);
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, extras, customThemes]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue != null) {
        setThemeState(readStoredTheme());
      } else if (event.key === CUSTOM_THEMES_STORAGE_KEY) {
        setCustomThemesState(loadCustomThemes());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!extrasReady) return;
    if (theme.startsWith("ext:") && !extras.some((item) => `ext:${item.id}` === theme)) {
      setThemeState("dark");
    }
  }, [extras, extrasReady, theme]);

  useEffect(() => {
    if (theme.startsWith("custom:")) {
      const customId = theme.slice(7);
      if (!customThemes.some((item) => item.id === customId) && !getCustomTheme(customId)) {
        setThemeState("dark");
      }
    }
  }, [customThemes, theme]);

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

  const saveCustomTheme = useCallback((themeDef: CustomThemeDefinition) => {
    const updated = persistCustomTheme(themeDef);
    setCustomThemesState(updated);
    setThemeState(`custom:${themeDef.id}`);
  }, []);

  const deleteCustomTheme = useCallback((id: string) => {
    const cleanId = id.startsWith("custom:") ? id.slice(7) : id;
    const updated = removeCustomTheme(cleanId);
    setCustomThemesState(updated);
    setThemeState((curr) => {
      if (curr === `custom:${cleanId}` || curr === cleanId) {
        return "dark";
      }
      return curr;
    });
  }, []);

  const importCustomTheme = useCallback(
    (jsonStr: string) => {
      const themeDef = importCustomThemeFromJson(jsonStr);
      saveCustomTheme(themeDef);
      return themeDef;
    },
    [saveCustomTheme]
  );

  const exportCustomTheme = useCallback(
    (id: string) => {
      const cleanId = id.startsWith("custom:") ? id.slice(7) : id;
      const found =
        customThemes.find((t) => t.id === cleanId) ?? getCustomTheme(cleanId);
      if (!found) {
        throw new Error(`Custom theme '${id}' not found`);
      }
      return exportCustomThemeJson(found);
    },
    [customThemes]
  );

  const value = useMemo(
    () => ({
      theme,
      extras,
      customThemes,
      setTheme,
      setExtras,
      toggleTheme,
      saveCustomTheme,
      deleteCustomTheme,
      importCustomTheme,
      exportCustomTheme,
    }),
    [
      theme,
      extras,
      customThemes,
      setTheme,
      setExtras,
      toggleTheme,
      saveCustomTheme,
      deleteCustomTheme,
      importCustomTheme,
      exportCustomTheme,
    ]
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
