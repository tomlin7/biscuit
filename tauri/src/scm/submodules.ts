import { invoke } from "@tauri-apps/api/core";

export type GitSubmoduleStatus =
  | "uninitialized"
  | "up-to-date"
  | "modified"
  | "conflict"
  | string;

export type GitSubmoduleInfo = {
  name: string;
  path: string;
  url: string;
  head_commit?: string | null;
  status: GitSubmoduleStatus;
};

export async function fetchGitSubmodules(root: string): Promise<GitSubmoduleInfo[]> {
  return await invoke<GitSubmoduleInfo[]>("git_submodules", { root });
}

export async function initGitSubmodule(root: string, path?: string | null): Promise<string> {
  return await invoke<string>("git_submodule_init", { root, path: path ?? null });
}

export async function updateGitSubmodule(
  root: string,
  path?: string | null,
  recursive: boolean = true,
): Promise<string> {
  return await invoke<string>("git_submodule_update", {
    root,
    path: path ?? null,
    recursive,
  });
}

export async function syncGitSubmodules(
  root: string,
  recursive: boolean = true,
): Promise<string> {
  return await invoke<string>("git_submodule_sync", { root, recursive });
}

export function formatSubmoduleStatus(status: string): {
  label: string;
  badgeClass: string;
} {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "uninitialized":
      return {
        label: "uninitialized",
        badgeClass: "scm-panel__submodule-badge--uninitialized",
      };
    case "modified":
      return {
        label: "modified",
        badgeClass: "scm-panel__submodule-badge--modified",
      };
    case "conflict":
    case "unmerged":
      return {
        label: "conflict",
        badgeClass: "scm-panel__submodule-badge--conflict",
      };
    case "up-to-date":
    default:
      return {
        label: "up-to-date",
        badgeClass: "scm-panel__submodule-badge--up-to-date",
      };
  }
}

export function formatSubmoduleCommit(sha?: string | null): string {
  if (!sha || !sha.trim()) return "—";
  return sha.trim().slice(0, 7);
}
