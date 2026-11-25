const SKIP_DIR_NAMES = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  "target",
  "dist",
  "build",
  ".next",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
]);

export function shouldSkipDir(name: string): boolean {
  return SKIP_DIR_NAMES.has(name) || name === ".DS_Store";
}

export function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function joinPath(parent: string, child: string): string {
  if (/^[A-Za-z]:[\\/]?$/.test(parent) || parent.endsWith("/") || parent.endsWith("\\")) {
    return `${parent.replace(/[\\/]+$/, "")}${parent.includes("\\") ? "\\" : "/"}${child}`;
  }
  const sep = parent.includes("\\") ? "\\" : "/";
  return `${parent}${sep}${child}`;
}

export function languageFromPath(path: string): string {
  const name = basename(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1) : "";

  switch (ext) {
    case "ts":
    case "mts":
    case "cts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
    case "mdx":
      return "markdown";
    case "rs":
      return "rust";
    case "py":
      return "python";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "html":
    case "htm":
      return "html";
    case "toml":
      return "ini";
    case "yml":
    case "yaml":
      return "yaml";
    case "xml":
      return "xml";
    case "sh":
    case "bash":
      return "shell";
    case "sql":
      return "sql";
    case "go":
      return "go";
    case "java":
      return "java";
    case "c":
      return "c";
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return "cpp";
    default:
      return "plaintext";
  }
}

export function isProbablyTextFile(path: string): boolean {
  const name = basename(path).toLowerCase();
  if (
    name === "dockerfile" ||
    name === "makefile" ||
    name === "cmakelists.txt" ||
    name === "license" ||
    name === "readme"
  ) {
    return true;
  }
  const binaryExt = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "ico",
    "bmp",
    "pdf",
    "zip",
    "gz",
    "7z",
    "rar",
    "exe",
    "dll",
    "so",
    "dylib",
    "wasm",
    "bin",
    "o",
    "obj",
    "class",
    "pyc",
    "woff",
    "woff2",
    "ttf",
    "otf",
    "mp3",
    "mp4",
    "webm",
    "mov",
    "avi",
    "sqlite",
    "db",
  ]);
  const dot = name.lastIndexOf(".");
  if (dot < 0) return true;
  return !binaryExt.has(name.slice(dot + 1));
}
