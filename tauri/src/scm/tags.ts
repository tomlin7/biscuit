import { invoke } from "@tauri-apps/api/core";

export type GitTagInfo = {
  name: string;
  commit: string;
  message?: string | null;
  annotated: boolean;
  date?: string | null;
};

export async function fetchGitTags(root: string): Promise<GitTagInfo[]> {
  return await invoke<GitTagInfo[]>("git_tags", { root });
}

export async function createGitTag(
  root: string,
  name: string,
  target?: string | null,
  message?: string | null,
): Promise<void> {
  return await invoke<void>("git_create_tag", {
    root,
    name,
    target: target && target.trim() ? target.trim() : null,
    message: message && message.trim() ? message.trim() : null,
  });
}

export async function deleteGitTag(root: string, name: string): Promise<void> {
  return await invoke<void>("git_delete_tag", { root, name: name.trim() });
}

export async function pushGitTags(root: string, remote?: string | null): Promise<void> {
  return await invoke<void>("git_push_tags", {
    root,
    remote: remote && remote.trim() ? remote.trim() : null,
  });
}

export async function deleteRemoteGitTag(
  root: string,
  name: string,
  remote?: string | null,
): Promise<void> {
  return await invoke<void>("git_delete_remote_tag", {
    root,
    name: name.trim(),
    remote: remote && remote.trim() ? remote.trim() : null,
  });
}

export function formatTagCommit(commit?: string | null): string {
  if (!commit || !commit.trim()) return "—";
  return commit.trim().slice(0, 7);
}

export function formatTagDate(date?: string | null): string {
  if (!date || !date.trim()) return "—";
  return date.trim();
}

export function validateTagName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Tag name cannot be empty" };
  }
  if (trimmed.startsWith("-")) {
    return { valid: false, error: "Tag name cannot start with a dash" };
  }
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return { valid: false, error: "Tag name cannot start or end with a dot" };
  }
  if (trimmed.endsWith(".lock")) {
    return { valid: false, error: "Tag name cannot end with .lock" };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: "Tag name cannot contain whitespace" };
  }
  if (/[~^:?*\[\\]/.test(trimmed) || trimmed.includes("..") || trimmed.includes("@{")) {
    return {
      valid: false,
      error: "Tag name contains illegal characters (~, ^, :, ?, *, [, \\, .., @{)",
    };
  }
  return { valid: true };
}

export function filterTags(tags: GitTagInfo[], query: string): GitTagInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return tags;
  return tags.filter((t) => {
    return (
      t.name.toLowerCase().includes(q) ||
      t.commit.toLowerCase().includes(q) ||
      (t.message ? t.message.toLowerCase().includes(q) : false)
    );
  });
}
