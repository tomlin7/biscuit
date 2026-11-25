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
import { runToolLoop, AgentAbortError } from "./toolLoop";
import { useNotifications } from "../notifications/NotificationsContext";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  toolCalls?: Array<{ id: string; name: string; detail: string; ok?: boolean }>;
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
  kind?: "text" | "image";
  mime?: string;
};

type AiSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
  /** Null uses the provider default. */
  temperature: number | null;
  /** Optional custom system prompt prepended to each request. */
  systemPrompt: string;
  /** Null uses the provider default. */
  maxTokens: number | null;
  /** Null uses the provider default. */
  topP: number | null;
  /** Null uses the provider default. */
  presencePenalty: number | null;
  /** Null uses the provider default. */
  frequencyPenalty: number | null;
  /** Null uses the provider default. */
  seed: number | null;
  /** When true, halt the tool loop after a failed tool call. */
  stopOnToolError: boolean;
  /** Max tool-loop rounds per request (clamped 1–32). */
  maxToolRounds: number;
  /** 0 = off; otherwise abort the request after this many seconds. */
  requestTimeoutSec: number;
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
  stop: () => void;
  regenerate: () => Promise<string | null>;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  attachFiles: () => Promise<void>;
  removeAttachment: (path: string) => void;
  clearAttachments: () => void;
  clearChat: () => void;
  attachPath: (path: string, name: string, content: string) => void;
  attachImage: (name: string, dataUrl: string, mime: string) => void;
  cycleEffort: () => void;
  exportSession: () => void;
  importSession: () => Promise<void>;
};

const SETTINGS_KEY = "t3d.ai.settings";
const SESSIONS_KEY = "t3d.ai.sessions";
const MAX_SESSIONS = 40;
const AiContext = createContext<AiState | null>(null);

function defaultSettings(): AiSettings {
  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
    effort: "high",
    temperature: null,
    systemPrompt: "",
    maxTokens: null,
    topP: null,
    presencePenalty: null,
    frequencyPenalty: null,
    seed: null,
    stopOnToolError: false,
    maxToolRounds: 8,
    requestTimeoutSec: 0,
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
      if (parsed.sessions?.length) {
        const pruned = [...parsed.sessions]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_SESSIONS);
        const active =
          pruned.find((s) => s.id === parsed.activeSessionId)?.id ?? pruned[0].id;
        return { sessions: pruned, activeSessionId: active };
      }
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
  const { push: notify } = useNotifications();
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
  const abortRef = useRef<AbortController | null>(null);

  const active =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? emptySession();
  const messages = active.messages;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    try {
      const pruned = [...sessions]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_SESSIONS);
      localStorage.setItem(
        SESSIONS_KEY,
        JSON.stringify({ sessions: pruned, activeSessionId }),
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
    setSessions((all) => [session, ...all].slice(0, MAX_SESSIONS));
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
      return [...current, { path, name, content, kind: "text" as const }];
    });
  }, []);

  const attachImage = useCallback((name: string, dataUrl: string, mime: string) => {
    const path = `clipboard-image://${crypto.randomUUID()}`;
    setAttachments((current) => [
      ...current,
      { path, name, content: dataUrl, kind: "image", mime },
    ]);
  }, []);

  const removeAttachment = useCallback((path: string) => {
    setAttachments((current) => current.filter((a) => a.path !== path));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const clearChat = useCallback(() => {
    patchActive((session) => ({
      ...session,
      messages: [],
      updatedAt: Date.now(),
    }));
    setError(null);
  }, [patchActive]);

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
          .filter((a) => a.kind !== "image")
          .map(
            (a) =>
              `File: ${a.path}\n\`\`\`\n${a.content.slice(0, 12000)}\n\`\`\``,
          )
          .join("\n\n");
        const imageNote = attachments
          .filter((a) => a.kind === "image")
          .map((a) => `Image attached: ${a.name} (${a.mime ?? "image"})`)
          .join("\n");
        const parts = [blocks, imageNote].filter(Boolean).join("\n\n");
        if (parts) fullPrompt = `${trimmed}\n\n---\nAttached context:\n\n${parts}`;
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
      const controller = new AbortController();
      abortRef.current = controller;
      let timeoutId: number | null = null;
      if (settings.requestTimeoutSec > 0) {
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, settings.requestTimeoutSec * 1000);
      }

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

        const history: Array<{
          role: string;
          content:
            | string
            | Array<
                | { type: "text"; text: string }
                | { type: "image_url"; image_url: { url: string } }
              >;
        }> = [...messagesRef.current, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const imageAtts = attachments.filter((a) => a.kind === "image");
        if (attachments.length > 0 || imageAtts.length > 0) {
          history[history.length - 1] = {
            role: "user",
            content:
              imageAtts.length > 0
                ? [
                    { type: "text", text: fullPrompt },
                    ...imageAtts.map((a) => ({
                      type: "image_url" as const,
                      image_url: { url: a.content },
                    })),
                  ]
                : fullPrompt,
          };
        }
        if (settings.systemPrompt.trim()) {
          history.unshift({
            role: "system",
            content: settings.systemPrompt.trim(),
          });
        } else if (settings.effort !== "medium") {
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
          signal: controller.signal,
          stopOnToolError: settings.stopOnToolError === true,
          maxRounds: Math.min(32, Math.max(1, settings.maxToolRounds || 8)),
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
                  ...(typeof settings.temperature === "number"
                    ? { temperature: settings.temperature }
                    : {}),
                  ...(typeof settings.maxTokens === "number"
                    ? { max_tokens: settings.maxTokens }
                    : {}),
                  ...(typeof settings.topP === "number"
                    ? { top_p: settings.topP }
                    : {}),
                  ...(typeof settings.presencePenalty === "number"
                    ? { presence_penalty: settings.presencePenalty }
                    : {}),
                  ...(typeof settings.frequencyPenalty === "number"
                    ? { frequency_penalty: settings.frequencyPenalty }
                    : {}),
                  ...(typeof settings.seed === "number"
                    ? { seed: settings.seed }
                    : {}),
                }),
                signal: controller.signal,
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
            return outcome;
          },
        });

        if (controller.signal.aborted) return null;

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
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          err instanceof AgentAbortError
        ) {
          const partial =
            err instanceof AgentAbortError
              ? err.partial.trim()
              : "";
          const content = partial
            ? `${partial}\n\n_(generation stopped)_`
            : "(stopped)";
          patchActive((session) => ({
            ...session,
            messages: [
              ...session.messages,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content,
                createdAt: Date.now(),
                toolCalls:
                  err instanceof AgentAbortError && err.toolCalls.length > 0
                    ? err.toolCalls
                    : undefined,
              },
            ],
            updatedAt: Date.now(),
          }));
          notify("Generation stopped", {
            detail: partial
              ? "Partial reply kept in the chat."
              : "No partial reply was available.",
          });
          return null;
        }
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return message;
      } finally {
        if (timeoutId != null) window.clearTimeout(timeoutId);
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [attachments, busy, patchActive, settings, notify],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const regenerate = useCallback(async () => {
    if (busy) return null;
    const msgs = messagesRef.current;
    let lastUser = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUser = i;
        break;
      }
    }
    if (lastUser < 0) return null;
    const prompt = msgs[lastUser].content;
    const prior = msgs.slice(0, lastUser);
    messagesRef.current = prior;
    patchActive((session) => ({
      ...session,
      messages: prior,
      updatedAt: Date.now(),
    }));
    return send(prompt);
  }, [busy, patchActive, send]);

  const exportSession = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      session: active,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = `${(active.title || "chat").replace(/[^\w.-]+/g, "_").slice(0, 40)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [active]);

  const importSession = useCallback(async () => {
    const selected = await open({
      multiple: false,
      title: "Import chat JSON",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (selected === null) return;
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    try {
      const text = await readTextFile(path);
      const parsed = JSON.parse(text) as {
        session?: Partial<ChatSession>;
        messages?: ChatMessage[];
        title?: string;
      };
      const source = parsed.session ?? parsed;
      const msgs = Array.isArray(source.messages) ? source.messages : [];
      const session: ChatSession = {
        id: crypto.randomUUID(),
        title:
          typeof source.title === "string" && source.title.trim()
            ? source.title.trim()
            : "Imported chat",
        messages: msgs.filter(
          (m) =>
            m &&
            typeof m === "object" &&
            typeof m.content === "string" &&
            (m.role === "user" || m.role === "assistant" || m.role === "system"),
        ),
        updatedAt: Date.now(),
      };
      setSessions((all) => [session, ...all].slice(0, MAX_SESSIONS));
      setActiveSessionId(session.id);
      setShowHistory(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

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
      stop,
      regenerate,
      newChat,
      selectSession,
      deleteSession,
      attachFiles,
      removeAttachment,
      clearAttachments,
      clearChat,
      attachPath,
      attachImage,
      cycleEffort,
      exportSession,
      importSession,
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
      stop,
      regenerate,
      newChat,
      selectSession,
      deleteSession,
      attachFiles,
      removeAttachment,
      clearAttachments,
      clearChat,
      attachPath,
      attachImage,
      cycleEffort,
      exportSession,
      importSession,
    ],
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi(): AiState {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAi must be used within AiProvider");
  return ctx;
}
