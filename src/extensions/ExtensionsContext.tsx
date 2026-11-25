import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type ExtensionManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  path: string;
  contributes?: {
    commands?: Array<{ id: string; title: string; runs?: string }>;
    themes?: Array<{
      id: string;
      label: string;
      mode: string;
      colors: { bg: string; fg: string; accent: string };
    }>;
    languages?: Array<{ id: string; aliases: string[]; extensions: string[] }>;
    webviews?: Array<{ id: string; title: string; entry: string }>;
  };
  /** Entry module run in the extension host; absent for declarative-only extensions. */
  main?: string | null;
  activationEvents?: string[];
  extensionKind?: "worker" | "ui";
};

type ExtensionsState = {
  extensions: ExtensionManifest[];
  loading: boolean;
  error: string | null;
  /** Resolves to the reloaded manifests, or null when listing failed (see `error`). */
  refresh: () => Promise<ExtensionManifest[] | null>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  installSample: () => Promise<void>;
  installFromFolder: () => Promise<void>;
  scaffoldInFolder: () => Promise<void>;
};

const ExtensionsContext = createContext<ExtensionsState | null>(null);

export function ExtensionsProvider({ children }: { children: ReactNode }) {
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<ExtensionManifest[]>("list_extensions");
      setExtensions(list);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      await invoke("set_extension_enabled", { id, enabled });
      await refresh();
    },
    [refresh],
  );

  const installSample = useCallback(async () => {
    await invoke("install_sample_extension");
    await refresh();
  }, [refresh]);

  const installFromFolder = useCallback(async () => {
    setError(null);
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Extension folder",
    });
    if (selected === null || Array.isArray(selected)) return;
    try {
      await invoke("install_local_extension", { source: selected });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refresh]);

  const scaffoldInFolder = useCallback(async () => {
    setError(null);
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Folder for a new extension",
    });
    if (selected === null || Array.isArray(selected)) return;
    try {
      await invoke("scaffold_extension", { dest: selected });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      extensions,
      loading,
      error,
      refresh,
      setEnabled,
      installSample,
      installFromFolder,
      scaffoldInFolder,
    }),
    [
      extensions,
      loading,
      error,
      refresh,
      setEnabled,
      installSample,
      installFromFolder,
      scaffoldInFolder,
    ],
  );

  return (
    <ExtensionsContext.Provider value={value}>
      {children}
    </ExtensionsContext.Provider>
  );
}

export function useExtensions(): ExtensionsState {
  const ctx = useContext(ExtensionsContext);
  if (!ctx) {
    throw new Error("useExtensions must be used within ExtensionsProvider");
  }
  return ctx;
}
