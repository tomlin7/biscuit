import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SettingsContext } from "../../settings/SettingsContext";
import { BUILTIN_ICON_THEMES, MATERIAL_THEME } from "./builtins";
import { resolveIcon } from "./resolver";
import type { IconThemeDefinition, ResolvedIcon } from "./types";

export type IconThemeState = {
  iconTheme: string;
  activeTheme: IconThemeDefinition;
  availableThemes: IconThemeDefinition[];
  setIconTheme: (id: string) => void;
  setContributedThemes: (themes: IconThemeDefinition[]) => void;
  registerCustomTheme: (theme: IconThemeDefinition) => void;
  removeCustomTheme: (themeId: string) => void;
  getIconForFile: (name: string) => ResolvedIcon;
  getIconForFolder: (name: string, open?: boolean) => ResolvedIcon;
};

const STORAGE_KEY = "t3d.iconTheme";
const CUSTOM_STORAGE_KEY = "t3d.customIconThemes";

function readStoredTheme(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && typeof val === "string" && val.trim()) {
      return val.trim();
    }
    const rawSettings = localStorage.getItem("t3d.settings.v1");
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed?.iconTheme && typeof parsed.iconTheme === "string" && parsed.iconTheme.trim()) {
        return parsed.iconTheme.trim();
      }
    }
  } catch {
    /* ignore */
  }
  return "material";
}

function readStoredCustomThemes(): IconThemeDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

const DEFAULT_STATE: IconThemeState = {
  iconTheme: "material",
  activeTheme: MATERIAL_THEME,
  availableThemes: BUILTIN_ICON_THEMES,
  setIconTheme: () => {},
  setContributedThemes: () => {},
  registerCustomTheme: () => {},
  removeCustomTheme: () => {},
  getIconForFile: (name) => resolveIcon(MATERIAL_THEME, name, "file"),
  getIconForFolder: (name, open) => resolveIcon(MATERIAL_THEME, name, "directory", open),
};

const IconThemeContext = createContext<IconThemeState>(DEFAULT_STATE);

export function IconThemeProvider({ children }: { children: ReactNode }) {
  const settingsCtx = useContext(SettingsContext);
  const [iconTheme, setIconThemeState] = useState<string>(() => {
    if (settingsCtx?.settings?.iconTheme) {
      return settingsCtx.settings.iconTheme;
    }
    return readStoredTheme();
  });
  const [contributedThemes, setContributedThemesState] = useState<IconThemeDefinition[]>([]);
  const [customThemes, setCustomThemes] = useState<IconThemeDefinition[]>(() =>
    readStoredCustomThemes(),
  );

  // Sync from SettingsContext if it changes externally (e.g. settings reset)
  useEffect(() => {
    if (settingsCtx?.settings?.iconTheme && settingsCtx.settings.iconTheme !== iconTheme) {
      setIconThemeState(settingsCtx.settings.iconTheme);
    }
  }, [settingsCtx?.settings?.iconTheme, iconTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, iconTheme);
    } catch {
      /* ignore */
    }
  }, [iconTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customThemes));
    } catch {
      /* ignore */
    }
  }, [customThemes]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setIconThemeState(e.newValue);
      } else if (e.key === "t3d.settings.v1" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.iconTheme && typeof parsed.iconTheme === "string") {
            setIconThemeState(parsed.iconTheme);
          }
        } catch {
          /* ignore */
        }
      } else if (e.key === CUSTOM_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCustomThemes(parsed);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setIconTheme = useCallback(
    (id: string) => {
      setIconThemeState(id);
      if (settingsCtx && settingsCtx.settings.iconTheme !== id) {
        settingsCtx.updateApp({ iconTheme: id });
      }
    },
    [settingsCtx],
  );

  const setContributedThemes = useCallback((themes: IconThemeDefinition[]) => {
    setContributedThemesState(themes);
  }, []);

  const registerCustomTheme = useCallback((theme: IconThemeDefinition) => {
    setCustomThemes((prev) => {
      const filtered = prev.filter((t) => t.id !== theme.id);
      return [...filtered, theme];
    });
  }, []);

  const removeCustomTheme = useCallback((themeId: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== themeId));
  }, []);

  const availableThemes = useMemo(() => {
    const ids = new Set<string>();
    const all: IconThemeDefinition[] = [];
    for (const t of BUILTIN_ICON_THEMES) {
      ids.add(t.id);
      all.push(t);
    }
    for (const t of contributedThemes) {
      if (!ids.has(t.id)) {
        ids.add(t.id);
        all.push(t);
      }
    }
    for (const t of customThemes) {
      if (!ids.has(t.id)) {
        ids.add(t.id);
        all.push(t);
      }
    }
    return all;
  }, [contributedThemes, customThemes]);

  const activeTheme = useMemo(() => {
    return (
      availableThemes.find((t) => t.id === iconTheme) ??
      availableThemes.find((t) => t.id === "material") ??
      MATERIAL_THEME
    );
  }, [availableThemes, iconTheme]);

  const getIconForFile = useCallback(
    (name: string) => {
      return resolveIcon(activeTheme, name, "file");
    },
    [activeTheme],
  );

  const getIconForFolder = useCallback(
    (name: string, open = false) => {
      return resolveIcon(activeTheme, name, "directory", open);
    },
    [activeTheme],
  );

  const value = useMemo(
    () => ({
      iconTheme,
      activeTheme,
      availableThemes,
      setIconTheme,
      setContributedThemes,
      registerCustomTheme,
      removeCustomTheme,
      getIconForFile,
      getIconForFolder,
    }),
    [
      iconTheme,
      activeTheme,
      availableThemes,
      setIconTheme,
      setContributedThemes,
      registerCustomTheme,
      removeCustomTheme,
      getIconForFile,
      getIconForFolder,
    ],
  );

  return <IconThemeContext.Provider value={value}>{children}</IconThemeContext.Provider>;
}

export function useIconTheme(): IconThemeState {
  const ctx = useContext(IconThemeContext);
  return ctx || DEFAULT_STATE;
}
