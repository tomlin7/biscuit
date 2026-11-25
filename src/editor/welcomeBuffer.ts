export const WELCOME_BUFFER_TITLE = "untitled-1.ts";

export const WELCOME_BUFFER_LANGUAGE = "typescript";

export const WELCOME_BUFFER_VALUE = `// T3D 0.2.0 — Monaco is the editor engine.
// Workspace FS lands in 0.3.0. Tabs land in 0.4.0.

type Milestone = {
  version: string;
  focus: string;
};

const current: Milestone = {
  version: "0.2.0",
  focus: "Monaco editor engine",
};

export function describe(m: Milestone): string {
  return \`T3D \${m.version}: \${m.focus}\`;
}

console.log(describe(current));
`;

export function languageLabel(languageId: string): string {
  switch (languageId) {
    case "typescript":
      return "TypeScript";
    case "javascript":
      return "JavaScript";
    case "json":
      return "JSON";
    case "html":
      return "HTML";
    case "css":
      return "CSS";
    case "markdown":
      return "Markdown";
    case "python":
      return "Python";
    case "rust":
      return "Rust";
    case "plaintext":
      return "Plain Text";
    default:
      return languageId;
  }
}
