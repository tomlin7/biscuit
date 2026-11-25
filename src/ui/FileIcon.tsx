import {
  File,
  Folder,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Settings,
  Terminal,
} from "lucide-react";
import { useIconTheme } from "../theme/iconTheme/IconThemeContext";
import "./fileIcon.css";

type Props = {
  name: string;
  kind: "file" | "directory";
  open?: boolean;
  size?: number;
  className?: string;
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

function renderClassic(name: string, kind: "file" | "directory", open: boolean, size: number) {
  if (kind === "directory") {
    const Icon = open ? FolderOpen : Folder;
    return <Icon size={size} strokeWidth={1.75} className="file-icon file-icon--folder" />;
  }

  const clean = name.trim().replace(/[/\\]+$/, "");
  const lastSlash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  const base = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
  const ext = extOf(base);
  const lower = base.toLowerCase();

  if (lower === ".gitignore" || lower === ".gitattributes") {
    return <GitBranch size={size} strokeWidth={1.75} className="file-icon file-icon--git" />;
  }
  if (lower.startsWith(".env")) {
    return <Settings size={size} strokeWidth={1.75} className="file-icon file-icon--env" />;
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
  if (ext === "pdf") return <Badge text="PDF" tone="pdf" />;
  if (ext === "csv" || ext === "tsv") return <Badge text="CSV" tone="csv" />;
  if (
    [
      "bin",
      "exe",
      "dll",
      "so",
      "dylib",
      "wasm",
      "hex",
      "dat",
      "iso",
      "img",
      "rom",
      "elf",
      "o",
      "obj",
      "class",
      "pyc",
    ].includes(ext)
  ) {
    return <Badge text="HEX" tone="hex" />;
  }
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

function extractSvgInner(svg: string): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return match ? match[1] : svg;
}

export function FileIcon({ name, kind, open = false, size = 14, className }: Props) {
  const { getIconForFile, getIconForFolder } = useIconTheme();

  const resolved =
    kind === "directory" ? getIconForFolder(name, open) : getIconForFile(name);

  if (resolved.isNone) {
    return <span style={{ width: size, display: "inline-block" }} aria-hidden />;
  }

  if (resolved.isBadge) {
    return renderClassic(name, kind, open, size);
  }

  if (resolved.badge) {
    return <Badge text={resolved.badge} tone={resolved.tone || "js"} />;
  }

  if (resolved.svg) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={resolved.viewBox || "0 0 24 24"}
        fill={resolved.fill ? (resolved.color || "currentColor") : "none"}
        stroke={resolved.fill ? "none" : (resolved.color || "currentColor")}
        strokeWidth={resolved.strokeWidth ?? 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`file-icon ${className || ""}`}
        style={{ color: resolved.color }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: extractSvgInner(resolved.svg) }}
      />
    );
  }

  return renderClassic(name, kind, open, size);
}
