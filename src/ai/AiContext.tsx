import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { agentToolSchema, runAgentTool } from "./tools";
import { runToolLoop } from "./toolLoop";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  toolCalls?: Array<{ id: string; name: string; detail: string }>;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type AiAttachment = {
  path: string;
  name: string;
  content: string;
};

type AiSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
};

type AiState = {
  sessions: ChatSession[];
  activeSessionId: string;
  messages: ChatMessage[];
  attachments: AiAttachment[];
  settings: AiSettings;
  busy: boolean;
  error: string | null;
  showHistory: boolean;
  setShowHistory: (open: boolean) => void;
  setSettings: (next: Partial<AiSettings>) => void;
  send: (prompt: string) => Promise<string | null>;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  attachFiles: () => Promise<void>;
  removeAttachment: (path: string) => void;
  attachPath: (path: string, name: string, content: string) => void;
  cycleEffort: () => void;
};

const SETTINGS_KEY = "t3d.ai.settings";
const SESSIONS_KEY = "t3d.ai.sessions";
const AiContext = createContext<AiState | null>(null);

function defaultSettings(): AiSettings {
  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
    effort: "high",
  };
}

function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultSettings();
}

function emptySession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function loadSessions(): { sessions: ChatSession[]; activeSessionId: string } {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        sessions: ChatSession[];
        activeSessionId: string;
      };
      if (parsed.sessions?.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  const session = emptySession();
  return { sessions: [session], activeSessionId: session.id };
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

export function AiProvider({ children }: { children: ReactNode }) {
  const { rootPath, roots, tabs, document, setValueAt, applyDiskValue } = useWorkspace();
  const workspaceRef = useRef({ rootPath, roots, tabs, document, setValueAt, applyDiskValue });
  workspaceRef.current = { rootPath, roots, tabs, document, setValueAt, applyDiskValue };
  const initial = useMemo(() => loadSessions(), []);
  const [sessions, setSessions] = useState<ChatSession[]>(initial.sessions);
  const [activeSessionId, setActiveSessionId] = useState(initial.activeSessionId);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [settings, setSettingsState] = useState<AiSettings>(() => loadSettings());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const active =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? emptySession();
  const messages = active.messages;

  useEffect(() => {
    try {
      localStorage.setItem(
        SESSIONS_KEY,
        JSON.stringify({ sessions, activeSessionId }),
      );
    } catch {
      /* ignore */
    }
  }, [sessions, activeSessionId]);

  const setSettings = useCallback((next: Partial<AiSettings>) => {
    setSettingsState((current) => {
      const merged = { ...current, ...next };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, []);

  const cycleEffort = useCallback(() => {
    setSettingsState((current) => {
      const order: AiSettings["effort"][] = ["low", "medium", "high"];
      const i = order.indexOf(current.effort);
      const merged = {
        ...current,
        effort: order[(i + 1) % order.length],
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, []);

  const patchActive = useCallback(
    (updater: (session: ChatSession) => ChatSession) => {
      setSessions((all) =>
        all.map((s) => (s.id === activeSessionId ? updater(s) : s)),
      );
    },
    [activeSessionId],
  );

  const newChat = useCallback(() => {
    const session = emptySession();
    setSessions((all) => [session, ...all]);
    setActiveSessionId(session.id);
    setAttachments([]);
    setError(null);
    setShowHistory(false);
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setShowHistory(false);
    setError(null);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((all) => {
        const next = all.filter((s) => s.id !== id);
        if (next.length === 0) {
          const fresh = emptySession();
          setActiveSessionId(fresh.id);
          return [fresh];
        }
        if (id === activeSessionId) setActiveSessionId(next[0].id);
        return next;
      });
    },
    [activeSessionId],
  );

  const attachPath = useCallback((path: string, name: string, content: string) => {
    setAttachments((current) => {
      if (current.some((a) => a.path === path)) return current;
      return [...current, { path, name, content }];
    });
  }, []);

  const removeAttachment = useCallback((path: string) => {
    setAttachments((current) => current.filter((a) => a.path !== path));
  }, []);

  const attachFiles = useCallback(async () => {
    const selected = await open({
      multiple: true,
      title: "Attach files to chat",
    });
    if (selected === null) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    for (const path of paths) {
      try {
        const content = await readTextFile(path);
        attachPath(path, basename(path), content);
      } catch {
        /* skip binary/unreadable */
      }
    }
  }, [attachPath]);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || busy) return null;

      let fullPrompt = trimmed;
      if (attachments.length > 0) {
        const blocks = attachments
          .map(
            (a) =>
              `File: ${a.path}\n\`\`\`\n${a.content.slice(0, 12000)}\n\`\`\``,
          )
          .join("\n\n");
        fullPrompt = `${trimmed}\n\n---\nAttached context:\n\n${blocks}`;
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      patchActive((session) => ({
        ...session,
        title:
          session.messages.length === 0
            ? trimmed.slice(0, 48)
            : session.title,
        messages: [...session.messages, userMsg],
        updatedAt: Date.now(),
      }));
      setBusy(true);
      setError(null);

      try {
        if (!settings.apiKey) {
          const assistant: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "No API key configured. Open Settings (Ctrl+,) → AI, set an OpenAI-compatible base URL + API key, then try again.",
            createdAt: Date.now(),
          };
          patchActive((session) => ({
            ...session,
            messages: [...session.messages, assistant],
            updatedAt: Date.now(),
          }));
          return assistant.content;
        }

        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        if (attachments.length > 0) {
          history[history.length - 1] = {
            role: "user",
            content: fullPrompt,
          };
        }
        if (settings.effort !== "medium") {
          history.unshift({
            role: "system",
            content:
              settings.effort === "high"
                ? "Be thorough and precise. Prefer concrete code-level answers."
                : "Be brief. Prefer short answers.",
          });
        }

        const result = await runToolLoop({
          messages: history,
          complete: async (nextMessages) => {
            const res = await fetch(
              `${settings.baseUrl.replace(/\/$/, "")}/chat/completions`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${settings.apiKey}`,
                },
                body: JSON.stringify({
                  model: settings.model,
                  messages: nextMessages,
                  tools: agentToolSchema,
                }),
              },
            );
            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || `HTTP ${res.status}`);
            }
            const data = (await res.json()) as {
              choices?: Array<{
                message?: {
                  content?: string | null;
                  tool_calls?: Array<{
                    id: string;
                    function: { name: string; arguments: string };
                  }>;
                };
              }>;
            };
            const message = data.choices?.[0]?.message;
            return {
              content: message?.content ?? null,
              toolCalls: (message?.tool_calls ?? []).map((call) => ({
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
              })),
            };
          },
          callTool: async (name, args) => {
            const workspace = workspaceRef.current;
            const outcome = await runAgentTool(
              name,
              args,
              workspace.roots.length > 0
                ? workspace.roots
                : workspace.rootPath
                  ? [workspace.rootPath]
                  : [],
              {
                tabs: workspace.tabs,
                setValueAt: workspace.setValueAt,
                applyDiskValue: workspace.applyDiskValue,
              },
              {
                path: workspace.document?.path ?? null,
                text: workspace.document?.value ?? null,
              },
            );
            return outcome.text;
          },
        });

        patchActive((session) => ({
          ...session,
          messages: [
            ...session.messages,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: result.content,
              createdAt: Date.now(),
              toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
            },
          ],
          updatedAt: Date.now(),
        }));
        return result.content;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return message;
      } finally {
        setBusy(false);
      }
    },
    [attachments, busy, messages, patchActive, settings],
  );

  const value = useMemo(
    () => ({
      sessions,
      activeSessionId,
      messages,
      attachments,
      settings,
      busy,
      error,
      showHistory,
      setShowHistory,
      setSettings,
      send,
      newChat,
      selectSession,
      deleteSession,
      attachFiles,
      removeAttachment,
      attachPath,
      cycleEffort,
    }),
    [
      sessions,
      activeSessionId,
      messages,
      attachments,
      settings,
      busy,
      error,
      showHistory,
      setSettings,
      send,
      newChat,
      selectSession,
      deleteSession,
      attachFiles,
      removeAttachment,
      attachPath,
      cycleEffort,
    ],
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi(): AiState {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAi must be used within AiProvider");
  return ctx;
}
