import { invoke } from "@tauri-apps/api/core";

export type GitCommitInfo = {
  sha: string;
  short_sha: string;
  author: string;
  date: string;
  message: string;
};

export type RebaseAction =
  | "pick"
  | "reword"
  | "edit"
  | "squash"
  | "fixup"
  | "drop";

export type RebaseTodoItem = {
  action: RebaseAction;
  sha: string;
  short_sha: string;
  message: string;
  author?: string | null;
  date?: string | null;
};

export type GitRebaseStatus = {
  in_progress: boolean;
  current_step?: number | null;
  total_steps?: number | null;
  head_name?: string | null;
  onto?: string | null;
  current_commit?: string | null;
  has_conflicts: boolean;
  conflicts: string[];
  rebase_type?: string | null;
  cherry_pick_in_progress: boolean;
  cherry_pick_head?: string | null;
};

export type GitRebaseResult = {
  success: boolean;
  status: string; // "complete" | "stopped" | "conflict" | "error"
  message: string;
  current_commit?: string | null;
  conflicts: string[];
};

export type GitCherryPickResult = {
  success: boolean;
  status: string; // "complete" | "conflict" | "error"
  message: string;
  conflicts: string[];
};

export async function fetchGitLog(
  root: string,
  maxCount?: number,
  branch?: string,
): Promise<GitCommitInfo[]> {
  return await invoke<GitCommitInfo[]>("git_log", {
    root,
    maxCount: maxCount ?? null,
    branch: branch && branch.trim() ? branch.trim() : null,
  });
}

export async function fetchRebaseStatus(root: string): Promise<GitRebaseStatus> {
  return await invoke<GitRebaseStatus>("git_rebase_status", { root });
}

export async function fetchRebaseTodo(
  root: string,
  upstream: string,
): Promise<RebaseTodoItem[]> {
  return await invoke<RebaseTodoItem[]>("git_rebase_todo", {
    root,
    upstream: upstream.trim(),
  });
}

export async function startRebase(
  root: string,
  upstream: string,
  items: RebaseTodoItem[],
): Promise<GitRebaseResult> {
  return await invoke<GitRebaseResult>("git_rebase_start", {
    root,
    upstream: upstream.trim(),
    items,
  });
}

export async function continueRebase(root: string): Promise<GitRebaseResult> {
  return await invoke<GitRebaseResult>("git_rebase_continue", { root });
}

export async function abortRebase(root: string): Promise<void> {
  return await invoke<void>("git_rebase_abort", { root });
}

export async function skipRebase(root: string): Promise<GitRebaseResult> {
  return await invoke<GitRebaseResult>("git_rebase_skip", { root });
}

export async function cherryPick(
  root: string,
  commit: string,
  noCommit?: boolean,
): Promise<GitCherryPickResult> {
  return await invoke<GitCherryPickResult>("git_cherry_pick", {
    root,
    commit: commit.trim(),
    noCommit: !!noCommit,
  });
}

export async function continueCherryPick(root: string): Promise<GitCherryPickResult> {
  return await invoke<GitCherryPickResult>("git_cherry_pick_continue", { root });
}

export async function abortCherryPick(root: string): Promise<void> {
  return await invoke<void>("git_cherry_pick_abort", { root });
}

export function moveTodoItem(
  items: RebaseTodoItem[],
  fromIndex: number,
  toIndex: number,
): RebaseTodoItem[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function updateTodoAction(
  items: RebaseTodoItem[],
  index: number,
  action: RebaseAction,
): RebaseTodoItem[] {
  if (index < 0 || index >= items.length) return [...items];
  return items.map((item, idx) => (idx === index ? { ...item, action } : item));
}

export function updateTodoMessage(
  items: RebaseTodoItem[],
  index: number,
  message: string,
): RebaseTodoItem[] {
  if (index < 0 || index >= items.length) return [...items];
  return items.map((item, idx) => (idx === index ? { ...item, message } : item));
}

export function validateRebaseTodo(items: RebaseTodoItem[]): {
  valid: boolean;
  error?: string;
} {
  if (!items || items.length === 0) {
    return { valid: false, error: "No commits selected for rebase" };
  }
  const nonDropped = items.filter((item) => item.action !== "drop");
  if (nonDropped.length === 0) {
    return { valid: false, error: "Cannot drop all commits in rebase plan" };
  }
  // The first non-dropped commit cannot be squash or fixup
  const firstActive = nonDropped[0];
  if (firstActive.action === "squash" || firstActive.action === "fixup") {
    return {
      valid: false,
      error: `Cannot ${firstActive.action} the first commit in the rebase plan`,
    };
  }
  return { valid: true };
}

export function formatRebaseStatusBanner(status: GitRebaseStatus | null): {
  title: string;
  subtitle?: string;
  isCherryPick: boolean;
  canContinue: boolean;
  canSkip: boolean;
  canAbort: boolean;
} | null {
  if (!status) return null;

  if (status.cherry_pick_in_progress) {
    const shortSha = status.cherry_pick_head
      ? status.cherry_pick_head.slice(0, 7)
      : null;
    const title = shortSha
      ? `Cherry-pick in progress (${shortSha})`
      : "Cherry-pick in progress";
    const subtitle = status.has_conflicts
      ? `Conflicts in ${status.conflicts.length} file${status.conflicts.length === 1 ? "" : "s"}. Resolve and continue.`
      : "Staged changes ready. Continue or abort.";
    return {
      title,
      subtitle,
      isCherryPick: true,
      canContinue: true,
      canSkip: false,
      canAbort: true,
    };
  }

  if (status.in_progress) {
    const stepPart =
      status.current_step && status.total_steps
        ? ` (step ${status.current_step}/${status.total_steps})`
        : "";
    const title = `Rebase in progress${stepPart}`;
    let subtitle: string;
    if (status.has_conflicts) {
      subtitle = `Conflicts in ${status.conflicts.length} file${status.conflicts.length === 1 ? "" : "s"}. Resolve conflicts, stage files, and continue.`;
    } else if (status.current_commit) {
      subtitle = `Stopped at commit ${status.current_commit.slice(0, 7)}. Amend changes and continue.`;
    } else {
      subtitle = "Rebase paused. Continue, skip, or abort.";
    }
    return {
      title,
      subtitle,
      isCherryPick: false,
      canContinue: true,
      canSkip: true,
      canAbort: true,
    };
  }

  return null;
}
