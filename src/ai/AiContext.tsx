import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type AiSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type AiState = {
  messages: ChatMessage[];
  settings: AiSettings;
  busy: boolean;
  error: string | null;
  setSettings: (next: Partial<AiSettings>) => void;
  send: (prompt: string) => Promise<void>;
  clear: () => void;
};

const STORAGE_KEY = "t3d.ai.settings";
const AiContext = createContext<AiState | null>(null);

function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultSettings();
}

function defaultSettings(): AiSettings {
  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
  };
}

export function AiProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettingsState] = useState<AiSettings>(() => loadSettings());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSettings = useCallback((next: Partial<AiSettings>) => {
    setSettingsState((current) => {
      const merged = { ...current, ...next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || busy) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((m) => [...m, userMsg]);
      setBusy(true);
      setError(null);

      try {
        if (!settings.apiKey) {
          const assistant: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "No API key configured. Open Settings (Ctrl+,) → AI, set an OpenAI-compatible base URL + API key, then try again.",
          };
          setMessages((m) => [...m, assistant]);
          return;
        }

        const payloadMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model,
            messages: payloadMessages,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content =
          data.choices?.[0]?.message?.content?.trim() ||
          "(empty response from model)";

        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, settings],
  );

  const value = useMemo(
    () => ({
      messages,
      settings,
      busy,
      error,
      setSettings,
      send,
      clear,
    }),
    [messages, settings, busy, error, setSettings, send, clear],
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi(): AiState {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAi must be used within AiProvider");
  return ctx;
}
