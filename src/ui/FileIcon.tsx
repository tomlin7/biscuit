import {
  Braces,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Image,
  Settings,
  Terminal,
} from "lucide-react";
import "./fileIcon.css";

type Props = {
  name: string;
  kind: "file" | "directory";
  open?: boolean;
  size?: number;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function FileIcon({ name, kind, open = false, size = 14 }: Props) {
  if (kind === "directory") {
    const Icon = open ? FolderOpen : Folder;
    return <Icon size={size} strokeWidth={1.75} className="file-icon file-icon--folder" />;
  }

  const ext = extOf(name);
  const lower = name.toLowerCase();

  if (lower === ".gitignore" || lower === ".gitattributes") {
    return <GitBranch size={size} strokeWidth={1.75} className="file-icon file-icon--git" />;
  }
  if (lower.startsWith(".env") || lower.includes("config") || lower.endsWith("rc")) {
    return <Settings size={size} strokeWidth={1.75} className="file-icon file-icon--config" />;
  }
  if (ext === "ts" || ext === "tsx") {
    return <FileCode2 size={size} strokeWidth={1.75} className="file-icon file-icon--ts" />;
  }
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") {
    return <FileCode2 size={size} strokeWidth={1.75} className="file-icon file-icon--js" />;
  }
  if (ext === "json" || ext === "jsonc") {
    return <FileJson size={size} strokeWidth={1.75} className="file-icon file-icon--json" />;
  }
  if (ext === "md" || ext === "mdx" || ext === "txt") {
    return <FileText size={size} strokeWidth={1.75} className="file-icon file-icon--text" />;
  }
  if (ext === "yml" || ext === "yaml" || ext === "toml") {
    return <Braces size={size} strokeWidth={1.75} className="file-icon file-icon--data" />;
  }
  if (ext === "rs") {
    return <FileCode2 size={size} strokeWidth={1.75} className="file-icon file-icon--rust" />;
  }
  if (ext === "css" || ext === "scss" || ext === "less") {
    return <Braces size={size} strokeWidth={1.75} className="file-icon file-icon--css" />;
  }
  if (ext === "html" || ext === "svg") {
    return <Braces size={size} strokeWidth={1.75} className="file-icon file-icon--html" />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "ico"].includes(ext)) {
    return <Image size={size} strokeWidth={1.75} className="file-icon file-icon--image" />;
  }
  if (["sh", "bash", "zsh", "ps1", "bat", "cmd"].includes(ext)) {
    return <Terminal size={size} strokeWidth={1.75} className="file-icon file-icon--shell" />;
  }
  return <File size={size} strokeWidth={1.75} className="file-icon" />;
}
