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

export type ExtensionManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  path: string;
  contributes?: {
    commands?: Array<{ id: string; title: string }>;
  };
};

type ExtensionsState = {
  extensions: ExtensionManifest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  installSample: () => Promise<void>;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    }),
    [extensions, loading, error, refresh, setEnabled, installSample],
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
