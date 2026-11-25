export type ModelToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ModelMessage = {
  role: string;
  content?: string | null;
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
};

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
  callTool: (name: string, args: Record<string, string>) => Promise<string>;
  maxRounds?: number;
  signal?: AbortSignal;
}): Promise<{ content: string; toolCalls: ShownToolCall[] }> {
  const messages = [...input.messages];
  const shown: ShownToolCall[] = [];
  const maxRounds = input.maxRounds ?? 8;
  for (let round = 0; round < maxRounds; round++) {
    if (input.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const next = await input.complete(messages);
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
        throw new DOMException("Aborted", "AbortError");
      }
      const text = await input.callTool(call.name, stringArgs(call.arguments));
      shown.push({ id: call.id, name: call.name, detail: text.slice(0, 240) });
      messages.push({ role: "tool", tool_call_id: call.id, content: text });
    }
  }
  return { content: "Stopped after 8 tool rounds.", toolCalls: shown };
}
