function separator(path: string): "\\" | "/" {
  return path.includes("\\") ? "\\" : "/";
}

function splitParts(path: string): string[] {
  return path.replace(/\\/g, "/").split("/").filter((part) => part.length > 0);
}

function collapse(parts: string[]): string[] | null {
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return null;
      if (out.length === 1 && /^[A-Za-z]:$/.test(out[0])) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out;
}

function joinNative(parts: string[], sep: "\\" | "/"): string {
  if (parts.length === 0) return "";
  if (/^[A-Za-z]:$/.test(parts[0])) {
    if (parts.length === 1) return `${parts[0]}${sep}`;
    return `${parts[0]}${sep}${parts.slice(1).join(sep)}`;
  }
  if (sep === "/" && parts[0] !== "") {
    return parts.join(sep);
  }
  return parts.join(sep);
}

export function pathInsideRoot(root: string, input: string): string | null {
  const rootParts = collapse(splitParts(root));
  if (!rootParts || rootParts.length === 0) return null;
  const raw = input.trim();
  if (!raw) return null;
  const absolute = /^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith("/") || raw.startsWith("\\");
  const inputParts = splitParts(absolute ? raw : `${root}/${raw}`);
  const resolved = collapse(absolute ? inputParts : [...rootParts, ...splitParts(raw)]);
  if (!resolved) return null;
  const rootKey = rootParts.join("/").toLowerCase();
  const key = resolved.join("/").toLowerCase();
  if (key !== rootKey && !key.startsWith(`${rootKey}/`)) return null;
  return joinNative(resolved, separator(root));
}
