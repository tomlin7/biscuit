import { useWorkspace } from "../workspace/WorkspaceContext";

/** Render assistant/user text with clickable file-path tokens and copyable fences. */
export function RichMessage({ text }: { text: string }) {
  const { openFileAt, rootPath } = useWorkspace();
  const blocks = splitFences(text);

  return (
    <div className="ai-panel__bubble-text">
      {blocks.map((block, i) => {
        if (block.kind === "code") {
          return (
            <div key={i} className="ai-panel__code">
              <div className="ai-panel__code-bar">
                <span>{block.lang || "code"}</span>
                <button
                  type="button"
                  className="ai-panel__code-copy"
                  onClick={() => void navigator.clipboard.writeText(block.code)}
                >
                  Copy
                </button>
              </div>
              <pre>
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }
        return (
          <span key={i}>
            {tokenize(block.text).map((part, j) => {
              if (part.kind === "path") {
                return (
                  <button
                    key={`${part.value}-${j}`}
                    type="button"
                    className="ai-panel__path-link"
                    title={`Open ${part.value}`}
                    onClick={() => {
                      const abs =
                        rootPath && !/^[A-Za-z]:[\\/]|^[/]/.test(part.value)
                          ? `${rootPath.replace(/[/\\]$/, "")}/${part.value.replace(/^\.\//, "")}`.replace(
                              /\//g,
                              "\\",
                            )
                          : part.value;
                      void openFileAt(abs, 1, 1);
                    }}
                  >
                    {part.value}
                  </button>
                );
              }
              return <span key={j}>{part.value}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}

type Token = { kind: "text" | "path"; value: string };
type Block =
  | { kind: "text"; text: string }
  | { kind: "code"; lang: string; code: string };

function splitFences(input: string): Block[] {
  const parts = input.split(/```/);
  if (parts.length === 1) return [{ kind: "text", text: input }];
  const out: Block[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) out.push({ kind: "text", text: parts[i] });
      continue;
    }
    const body = parts[i] ?? "";
    const nl = body.indexOf("\n");
    const lang = (nl === -1 ? body : body.slice(0, nl)).trim();
    const code = (nl === -1 ? "" : body.slice(nl + 1)).replace(/\n$/, "");
    out.push({ kind: "code", lang, code });
  }
  return out.length ? out : [{ kind: "text", text: input }];
}

function tokenize(input: string): Token[] {
  // Paths like www/tsconfig.json, src/foo.ts, E:\a\b.ts, ./x.md
  const re =
    /(?:`([^`]+)`)|((?:[A-Za-z]:)?(?:\.\.?\/|\/)?[\w.-]+(?:\/[\w.-]+)+\.\w{1,8})/g;
  const out: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      out.push({ kind: "text", value: input.slice(last, match.index) });
    }
    const value = match[1] ?? match[2];
    if (value && /[./\\]/.test(value) && /\.\w{1,8}$/.test(value)) {
      out.push({ kind: "path", value });
    } else {
      out.push({ kind: "text", value: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    out.push({ kind: "text", value: input.slice(last) });
  }
  return out.length ? out : [{ kind: "text", value: input }];
}
