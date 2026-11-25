import {
  File,
  Folder,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
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

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: string;
}) {
  return (
    <span className={`file-badge file-badge--${tone}`} aria-hidden>
      {text}
    </span>
  );
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
  if (lower.startsWith(".env")) {
    return <Settings size={size} strokeWidth={1.75} className="file-icon file-icon--config" />;
  }
  if (ext === "ts") return <Badge text="TS" tone="ts" />;
  if (ext === "tsx") return <Badge text="TX" tone="ts" />;
  if (ext === "js" || ext === "mjs" || ext === "cjs") return <Badge text="JS" tone="js" />;
  if (ext === "jsx") return <Badge text="JX" tone="js" />;
  if (ext === "json" || ext === "jsonc") return <Badge text="{}" tone="json" />;
  if (ext === "md" || ext === "mdx") return <Badge text="MD" tone="md" />;
  if (ext === "yml" || ext === "yaml") return <Badge text="YML" tone="yaml" />;
  if (ext === "toml") return <Badge text="TM" tone="yaml" />;
  if (ext === "rs") return <Badge text="RS" tone="rust" />;
  if (ext === "css" || ext === "scss") return <Badge text="#" tone="css" />;
  if (ext === "html") return <Badge text="<>" tone="html" />;
  if (ext === "svg" || ["png", "jpg", "jpeg", "gif", "webp", "ico"].includes(ext)) {
    return <ImageIcon size={size} strokeWidth={1.75} className="file-icon file-icon--image" />;
  }
  if (["sh", "bash", "zsh", "ps1", "bat", "cmd"].includes(ext)) {
    return <Terminal size={size} strokeWidth={1.75} className="file-icon file-icon--shell" />;
  }
  if (lower.includes("config") || lower.endsWith("rc") || ext === "lock") {
    return <Settings size={size} strokeWidth={1.75} className="file-icon file-icon--config" />;
  }
  return <File size={size} strokeWidth={1.75} className="file-icon" />;
}
