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
    case "scss":
      return "SCSS";
    case "markdown":
      return "Markdown";
    case "python":
      return "Python";
    case "rust":
      return "Rust";
    case "yaml":
      return "YAML";
    case "shell":
      return "Shell";
    case "sql":
      return "SQL";
    case "go":
      return "Go";
    case "java":
      return "Java";
    case "c":
      return "C";
    case "cpp":
      return "C++";
    case "xml":
      return "XML";
    case "ini":
      return "INI";
    case "plaintext":
      return "Plain Text";
    case "image":
      return "Image";
    default:
      return languageId;
  }
}
