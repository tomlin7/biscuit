import { useWorkspace } from "../workspace/WorkspaceContext";

/** Render assistant/user text with clickable file-path tokens. */
export function RichMessage({ text }: { text: string }) {
  const { openFileAt, rootPath } = useWorkspace();

  const parts = tokenize(text);

  return (
    <div className="ai-panel__bubble-text">
      {parts.map((part, i) => {
        if (part.kind === "path") {
          return (
            <button
              key={`${part.value}-${i}`}
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
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

type Token = { kind: "text" | "path"; value: string };

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
