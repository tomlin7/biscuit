export type ModelToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ModelMessage = {
  role: string;
  content?:
    | string
    | null
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export type ShownToolCall = {
  id: string;
  name: string;
  detail: string;
  ok: boolean;
};

export class AgentAbortError extends Error {
  partial: string;
  toolCalls: ShownToolCall[];

  constructor(partial: string, toolCalls: ShownToolCall[]) {
    super("Aborted");
    this.name = "AbortError";
    this.partial = partial;
    this.toolCalls = toolCalls;
  }
}

function stringArgs(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    );
  } catch {
    return {};
  }
}

export async function runToolLoop(input: {
  messages: ModelMessage[];
  complete: (messages: ModelMessage[]) => Promise<{ content: string | null; toolCalls: ModelToolCall[] }>;
  callTool: (name: string, args: Record<string, string>) => Promise<{ ok: boolean; text: string }>;
  maxRounds?: number;
  signal?: AbortSignal;
  stopOnToolError?: boolean;
}): Promise<{ content: string; toolCalls: ShownToolCall[] }> {
  const messages = [...input.messages];
  const shown: ShownToolCall[] = [];
  let lastPartial = "";
  const maxRounds = input.maxRounds ?? 8;
  for (let round = 0; round < maxRounds; round++) {
    if (input.signal?.aborted) {
      throw new AgentAbortError(lastPartial, shown);
    }
    let next: { content: string | null; toolCalls: ModelToolCall[] };
    try {
      next = await input.complete(messages);
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError") ||
        input.signal?.aborted
      ) {
        throw new AgentAbortError(lastPartial, shown);
      }
      throw err;
    }
    if (next.content?.trim()) lastPartial = next.content.trim();
    if (next.toolCalls.length === 0) {
      return {
        content: next.content?.trim() || "(empty response from model)",
        toolCalls: shown,
      };
    }
    messages.push({
      role: "assistant",
      content: next.content,
      tool_calls: next.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.arguments },
      })),
    });
    for (const call of next.toolCalls) {
      if (input.signal?.aborted) {
        throw new AgentAbortError(lastPartial, shown);
      }
      let outcome: { ok: boolean; text: string };
      try {
        outcome = await input.callTool(call.name, stringArgs(call.arguments));
      } catch (err) {
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError") ||
          input.signal?.aborted
        ) {
          throw new AgentAbortError(lastPartial, shown);
        }
        throw err;
      }
      shown.push({
        id: call.id,
        name: call.name,
        detail: outcome.text.slice(0, 240),
        ok: outcome.ok,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: outcome.ok ? outcome.text : `Error: ${outcome.text}`,
      });
      if (!outcome.ok && input.stopOnToolError) {
        return {
          content:
            lastPartial ||
            `Stopped after tool error in ${call.name}: ${outcome.text.slice(0, 200)}`,
          toolCalls: shown,
        };
      }
    }
  }
  return {
    content: `Stopped after ${maxRounds} tool rounds.`,
    toolCalls: shown,
  };
}
