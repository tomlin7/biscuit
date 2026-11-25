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
  /** CSS font-family stack for the editor. */
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  /** Preferred wrap column when word wrap is on. */
  wordWrapColumn: number;
  /** Comma-separated ruler columns; empty disables. */
  rulers: string;
  /** Trim trailing whitespace on save even without EditorConfig. */
  trimTrailingWhitespace: boolean;
  /** Insert a final newline on save when EditorConfig is silent. */
  insertFinalNewline: boolean;
  /** Show whitespace characters in the editor. */
  renderWhitespace: boolean;
  /** Caret rendering style. */
  cursorStyle: "line" | "block" | "underline";
  minimap: boolean;
  lineNumbers: boolean;
  /** When line numbers are on, show relative numbers instead of absolute. */
  relativeLineNumbers: boolean;
  stickyScroll: boolean;
  /** Sticky condensed outline beside the minimap. */
  stickyOutline: boolean;
  /** Inlay hints for JS/TS parameter names and inferred types. */
  inlayHints: boolean;
  /** CodeLens reference counters above symbol declarations. */
  codeLens: boolean;
  /** 0 = off; otherwise idle milliseconds before auto-save. */
  autoSaveMs: number;
  /** Integrated terminal font size. */
  terminalFontSize: number;
};

export type JsonSchemaAssociation = {
  fileMatch: string[];
  uri: string;
  schema?: Record<string, unknown>;
};

export type AppSettings = {
  editor: EditorSettings;
  /** Win11 acrylic on shell crease and the dedicated settings window. Islands stay opaque. */
  chromeAcrylic: boolean;
  /** Preferred charset label shown in the status bar / encoding picker. */
  preferredEncoding: string;
  /** Remote extensions registry index.json URL. */
  extensionRegistryUrl: string;
  /** Native OS desktop notifications for background task completion. */
  desktopNotifications: boolean;
  /** Independent terminal color palette theme ('auto', 'dracula', 'one-dark', etc.) */
  terminalTheme: string;
  /** Active file icon theme ('material', 'seti', 'minimal-mono', 'classic', 'none', etc.) */
  iconTheme: string;
  /** Configurable JSON Schema associations (path pattern -> schema map). */
  jsonSchemas: JsonSchemaAssociation[];
};

type SettingsState = {
  settings: AppSettings;
  updateEditor: (patch: Partial<EditorSettings>) => void;
  updateChromeAcrylic: (on: boolean) => void;
  updateApp: (
    patch: Partial<
      Pick<
        AppSettings,
        | "preferredEncoding"
        | "extensionRegistryUrl"
        | "desktopNotifications"
        | "terminalTheme"
        | "iconTheme"
        | "jsonSchemas"
      >
    >,
  ) => void;
  updateJsonSchemas: (schemas: JsonSchemaAssociation[]) => void;
  reset: () => void;
};

const STORAGE_KEY = "t3d.settings.v1";

const DEFAULTS: AppSettings = {
  editor: {
    fontSize: 14,
    fontFamily: "Cascadia Code, Consolas, Courier New, monospace",
    tabSize: 2,
    wordWrap: false,
    wordWrapColumn: 80,
    rulers: "",
    trimTrailingWhitespace: false,
    insertFinalNewline: false,
    renderWhitespace: false,
    cursorStyle: "line",
    minimap: true,
    lineNumbers: true,
    relativeLineNumbers: false,
    stickyScroll: true,
    stickyOutline: false,
    inlayHints: false,
    codeLens: true,
    autoSaveMs: 0,
    terminalFontSize: 13,
  },
  chromeAcrylic: true,
  preferredEncoding: "UTF-8",
  extensionRegistryUrl:
    "https://raw.githubusercontent.com/Tomlin7/t3d/main/extensions-dist/index.json",
  desktopNotifications: true,
  terminalTheme: "auto",
  iconTheme: "material",
  jsonSchemas: [],
};

const SettingsContext = createContext<SettingsState | null>(null);

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      editor?: Partial<EditorSettings>;
    };
    return {
      editor: { ...DEFAULTS.editor, ...parsed.editor },
      chromeAcrylic:
        typeof parsed.chromeAcrylic === "boolean"
          ? parsed.chromeAcrylic
          : DEFAULTS.chromeAcrylic,
      preferredEncoding:
        typeof parsed.preferredEncoding === "string" && parsed.preferredEncoding.trim()
          ? parsed.preferredEncoding.trim().toUpperCase()
          : DEFAULTS.preferredEncoding,
      extensionRegistryUrl:
        typeof parsed.extensionRegistryUrl === "string" && parsed.extensionRegistryUrl.trim()
          ? parsed.extensionRegistryUrl.trim()
          : DEFAULTS.extensionRegistryUrl,
      desktopNotifications:
        typeof parsed.desktopNotifications === "boolean"
          ? parsed.desktopNotifications
          : DEFAULTS.desktopNotifications,
      terminalTheme:
        typeof parsed.terminalTheme === "string" && parsed.terminalTheme.trim()
          ? parsed.terminalTheme.trim()
          : DEFAULTS.terminalTheme,
      iconTheme:
        typeof parsed.iconTheme === "string" && parsed.iconTheme.trim()
          ? parsed.iconTheme.trim()
          : DEFAULTS.iconTheme,
      jsonSchemas: Array.isArray(parsed.jsonSchemas) ? parsed.jsonSchemas : DEFAULTS.jsonSchemas,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Non-hook read for save paths outside SettingsProvider. */
export function readTrimTrailingWhitespaceSetting(): boolean {
  return load().editor.trimTrailingWhitespace === true;
}

export function readInsertFinalNewlineSetting(): boolean {
  return load().editor.insertFinalNewline === true;
}

export function readDesktopNotificationsSetting(): boolean {
  return load().desktopNotifications !== false;
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

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue == null) return;
      setSettings(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateEditor = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((s) => ({
      ...s,
      editor: { ...s.editor, ...patch },
    }));
  }, []);

  const updateChromeAcrylic = useCallback((on: boolean) => {
    setSettings((s) => ({ ...s, chromeAcrylic: on }));
  }, []);

  const updateApp = useCallback(
    (
      patch: Partial<
        Pick<
          AppSettings,
          "preferredEncoding" | "extensionRegistryUrl" | "desktopNotifications" | "terminalTheme" | "jsonSchemas"
        >
      >,
    ) => {
      setSettings((s) => ({ ...s, ...patch }));
    },
    [],
  );

  const updateJsonSchemas = useCallback((schemas: JsonSchemaAssociation[]) => {
    setSettings((s) => ({ ...s, jsonSchemas: schemas }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const value = useMemo(
    () => ({
      settings,
      updateEditor,
      updateChromeAcrylic,
      updateApp,
      updateJsonSchemas,
      reset,
    }),
    [settings, updateEditor, updateChromeAcrylic, updateApp, updateJsonSchemas, reset],
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
