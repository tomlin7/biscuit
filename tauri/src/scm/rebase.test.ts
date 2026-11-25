import { describe, expect, test } from "bun:test";
import {
  moveTodoItem,
  updateTodoAction,
  updateTodoMessage,
  validateRebaseTodo,
  formatRebaseStatusBanner,
  fetchGitLog,
  fetchRebaseStatus,
  fetchRebaseTodo,
  startRebase,
  continueRebase,
  abortRebase,
  skipRebase,
  cherryPick,
  continueCherryPick,
  abortCherryPick,
  type RebaseTodoItem,
  type GitRebaseStatus,
} from "./rebase";
import { COMMANDS } from "../commands/registry";

const sampleItems: RebaseTodoItem[] = [
  {
    action: "pick",
    sha: "1111111111111111111111111111111111111111",
    short_sha: "1111111",
    message: "first commit",
    author: "Alice",
    date: "2026-11-01",
  },
  {
    action: "pick",
    sha: "2222222222222222222222222222222222222222",
    short_sha: "2222222",
    message: "second commit",
    author: "Bob",
    date: "2026-11-02",
  },
  {
    action: "pick",
    sha: "3333333333333333333333333333333333333333",
    short_sha: "3333333",
    message: "third commit",
    author: "Charlie",
    date: "2026-11-03",
  },
];

describe("Rebase Todo item manipulation", () => {
  test("moves an item from one index to another", () => {
    const moved = moveTodoItem(sampleItems, 0, 2);
    expect(moved[0].short_sha).toBe("2222222");
    expect(moved[1].short_sha).toBe("3333333");
    expect(moved[2].short_sha).toBe("1111111");
  });

  test("moves an item upward", () => {
    const moved = moveTodoItem(sampleItems, 2, 0);
    expect(moved[0].short_sha).toBe("3333333");
    expect(moved[1].short_sha).toBe("1111111");
    expect(moved[2].short_sha).toBe("2222222");
  });

  test("handles out of bound or invalid indices gracefully without throwing", () => {
    const same1 = moveTodoItem(sampleItems, -1, 1);
    expect(same1).toEqual(sampleItems);

    const same2 = moveTodoItem(sampleItems, 0, 10);
    expect(same2).toEqual(sampleItems);

    const same3 = moveTodoItem(sampleItems, 1, 1);
    expect(same3).toEqual(sampleItems);
  });

  test("updates todo action cleanly", () => {
    const updated = updateTodoAction(sampleItems, 1, "reword");
    expect(updated[1].action).toBe("reword");
    expect(updated[0].action).toBe("pick");
    expect(updated[2].action).toBe("pick");
  });

  test("updates todo message for reword action", () => {
    const updated = updateTodoMessage(sampleItems, 0, "first commit updated message");
    expect(updated[0].message).toBe("first commit updated message");
    expect(updated[1].message).toBe("second commit");
  });
});

describe("Rebase Todo validation", () => {
  test("rejects empty todo list", () => {
    const res = validateRebaseTodo([]);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("No commits selected");
  });

  test("rejects plan where all commits are dropped", () => {
    const allDropped = sampleItems.map((item) => ({ ...item, action: "drop" as const }));
    const res = validateRebaseTodo(allDropped);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Cannot drop all commits");
  });

  test("rejects first active commit set to squash or fixup", () => {
    const badSquash: RebaseTodoItem[] = [
      { ...sampleItems[0], action: "squash" },
      { ...sampleItems[1], action: "pick" },
    ];
    const res1 = validateRebaseTodo(badSquash);
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain("Cannot squash the first commit");

    const badFixupWithDropped: RebaseTodoItem[] = [
      { ...sampleItems[0], action: "drop" },
      { ...sampleItems[1], action: "fixup" },
      { ...sampleItems[2], action: "pick" },
    ];
    const res2 = validateRebaseTodo(badFixupWithDropped);
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain("Cannot fixup the first commit");
  });

  test("accepts valid rebase plan", () => {
    const validPlan: RebaseTodoItem[] = [
      { ...sampleItems[0], action: "pick" },
      { ...sampleItems[1], action: "reword", message: "new title" },
      { ...sampleItems[2], action: "squash" },
    ];
    const res = validateRebaseTodo(validPlan);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

describe("Rebase and Cherry-pick Status Banner formatting", () => {
  test("returns null when no status or inactive", () => {
    expect(formatRebaseStatusBanner(null)).toBeNull();

    const idle: GitRebaseStatus = {
      in_progress: false,
      has_conflicts: false,
      conflicts: [],
      cherry_pick_in_progress: false,
    };
    expect(formatRebaseStatusBanner(idle)).toBeNull();
  });

  test("formats rebase in progress banner with steps and conflicts", () => {
    const inProgress: GitRebaseStatus = {
      in_progress: true,
      current_step: 2,
      total_steps: 4,
      head_name: "feature",
      onto: "main",
      has_conflicts: true,
      conflicts: ["src/app.ts", "package.json"],
      cherry_pick_in_progress: false,
    };
    const banner = formatRebaseStatusBanner(inProgress);
    expect(banner).not.toBeNull();
    expect(banner?.title).toBe("Rebase in progress (step 2/4)");
    expect(banner?.subtitle).toContain("Conflicts in 2 files");
    expect(banner?.canContinue).toBe(true);
    expect(banner?.canSkip).toBe(true);
    expect(banner?.canAbort).toBe(true);
    expect(banner?.isCherryPick).toBe(false);
  });

  test("formats rebase in progress stopped at commit for edit", () => {
    const stopped: GitRebaseStatus = {
      in_progress: true,
      current_step: 1,
      total_steps: 2,
      current_commit: "abcdef0123456789",
      has_conflicts: false,
      conflicts: [],
      cherry_pick_in_progress: false,
    };
    const banner = formatRebaseStatusBanner(stopped);
    expect(banner).not.toBeNull();
    expect(banner?.title).toBe("Rebase in progress (step 1/2)");
    expect(banner?.subtitle).toContain("Stopped at commit abcdef0");
    expect(banner?.canContinue).toBe(true);
    expect(banner?.canSkip).toBe(true);
    expect(banner?.canAbort).toBe(true);
  });

  test("formats cherry-pick in progress banner", () => {
    const cp: GitRebaseStatus = {
      in_progress: false,
      has_conflicts: true,
      conflicts: ["README.md"],
      cherry_pick_in_progress: true,
      cherry_pick_head: "7777777777777777777777777777777777777777",
    };
    const banner = formatRebaseStatusBanner(cp);
    expect(banner).not.toBeNull();
    expect(banner?.title).toBe("Cherry-pick in progress (7777777)");
    expect(banner?.subtitle).toContain("Conflicts in 1 file");
    expect(banner?.isCherryPick).toBe(true);
    expect(banner?.canContinue).toBe(true);
    expect(banner?.canSkip).toBe(false);
    expect(banner?.canAbort).toBe(true);
  });
});

describe("Tauri invoke wrappers for rebase and cherry-pick", () => {
  test("invokes all rebase and cherry-pick backend commands with correct parameters", async () => {
    const originalWindow = (globalThis as any).window;
    const calls: Array<{ cmd: string; args: any }> = [];

    try {
      (globalThis as any).window = {
        __TAURI_INTERNALS__: {
          invoke: async (cmd: string, args: any) => {
            calls.push({ cmd, args });
            if (cmd === "git_log") {
              return [
                {
                  sha: "1111111111111111111111111111111111111111",
                  short_sha: "1111111",
                  author: "Alice",
                  date: "2026-11-10",
                  message: "test commit",
                },
              ];
            }
            if (cmd === "git_rebase_status") {
              return {
                in_progress: true,
                current_step: 1,
                total_steps: 3,
                has_conflicts: false,
                conflicts: [],
                cherry_pick_in_progress: false,
              };
            }
            if (cmd === "git_rebase_todo") {
              return sampleItems;
            }
            if (cmd === "git_rebase_start" || cmd === "git_rebase_continue" || cmd === "git_rebase_skip") {
              return {
                success: true,
                status: "complete",
                message: "Done",
                conflicts: [],
              };
            }
            if (cmd === "git_cherry_pick" || cmd === "git_cherry_pick_continue") {
              return {
                success: true,
                status: "complete",
                message: "Cherry-pick done",
                conflicts: [],
              };
            }
            return null;
          },
        },
      };

      const logs = await fetchGitLog("/repo", 25, "develop");
      expect(logs).toHaveLength(1);
      expect(calls[0]).toEqual({
        cmd: "git_log",
        args: { root: "/repo", maxCount: 25, branch: "develop" },
      });

      const status = await fetchRebaseStatus("/repo");
      expect(status.in_progress).toBe(true);
      expect(calls[1]).toEqual({
        cmd: "git_rebase_status",
        args: { root: "/repo" },
      });

      const todos = await fetchRebaseTodo("/repo", "main");
      expect(todos).toHaveLength(3);
      expect(calls[2]).toEqual({
        cmd: "git_rebase_todo",
        args: { root: "/repo", upstream: "main" },
      });

      const startRes = await startRebase("/repo", "main", sampleItems);
      expect(startRes.success).toBe(true);
      expect(calls[3]).toEqual({
        cmd: "git_rebase_start",
        args: { root: "/repo", upstream: "main", items: sampleItems },
      });

      const contRes = await continueRebase("/repo");
      expect(contRes.success).toBe(true);
      expect(calls[4]).toEqual({
        cmd: "git_rebase_continue",
        args: { root: "/repo" },
      });

      const skipRes = await skipRebase("/repo");
      expect(skipRes.success).toBe(true);
      expect(calls[5]).toEqual({
        cmd: "git_rebase_skip",
        args: { root: "/repo" },
      });

      await abortRebase("/repo");
      expect(calls[6]).toEqual({
        cmd: "git_rebase_abort",
        args: { root: "/repo" },
      });

      const cpRes = await cherryPick("/repo", "abc1234", true);
      expect(cpRes.success).toBe(true);
      expect(calls[7]).toEqual({
        cmd: "git_cherry_pick",
        args: { root: "/repo", commit: "abc1234", noCommit: true },
      });

      const cpCont = await continueCherryPick("/repo");
      expect(cpCont.success).toBe(true);
      expect(calls[8]).toEqual({
        cmd: "git_cherry_pick_continue",
        args: { root: "/repo" },
      });

      await abortCherryPick("/repo");
      expect(calls[9]).toEqual({
        cmd: "git_cherry_pick_abort",
        args: { root: "/repo" },
      });

      // Test --root upstream handling
      const rootTodos = await fetchRebaseTodo("/repo", "--root");
      expect(rootTodos).toHaveLength(3);
      expect(calls[10]).toEqual({
        cmd: "git_rebase_todo",
        args: { root: "/repo", upstream: "--root" },
      });

      const rootStart = await startRebase("/repo", "--root", sampleItems);
      expect(rootStart.success).toBe(true);
      expect(calls[11]).toEqual({
        cmd: "git_rebase_start",
        args: { root: "/repo", upstream: "--root", items: sampleItems },
      });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });

  test("registers rebase and cherry-pick commands in COMMANDS registry", () => {
    const rebaseInteractive = COMMANDS.find((c) => c.id === "git.rebase.interactive");
    expect(rebaseInteractive).toBeDefined();
    expect(rebaseInteractive?.title).toBe("Git: Interactive Rebase...");
    expect(rebaseInteractive?.category).toBe("Git");

    const rebaseContinue = COMMANDS.find((c) => c.id === "git.rebase.continue");
    expect(rebaseContinue).toBeDefined();
    expect(rebaseContinue?.title).toBe("Git: Continue Rebase");

    const rebaseAbort = COMMANDS.find((c) => c.id === "git.rebase.abort");
    expect(rebaseAbort).toBeDefined();
    expect(rebaseAbort?.title).toBe("Git: Abort Rebase");

    const cp = COMMANDS.find((c) => c.id === "git.cherryPick");
    expect(cp).toBeDefined();
    expect(cp?.title).toBe("Git: Cherry-pick Commit...");

    const cpContinue = COMMANDS.find((c) => c.id === "git.cherryPick.continue");
    expect(cpContinue).toBeDefined();
    expect(cpContinue?.title).toBe("Git: Continue Cherry-pick");

    const cpAbort = COMMANDS.find((c) => c.id === "git.cherryPick.abort");
    expect(cpAbort).toBeDefined();
    expect(cpAbort?.title).toBe("Git: Abort Cherry-pick");

    const called: Record<string, boolean> = {};
    const mockCtx: any = {
      gitRebaseInteractive: () => {
        called.rebaseInteractive = true;
      },
      gitRebaseContinue: () => {
        called.rebaseContinue = true;
      },
      gitRebaseAbort: () => {
        called.rebaseAbort = true;
      },
      gitCherryPick: () => {
        called.cherryPick = true;
      },
      gitCherryPickContinue: () => {
        called.cherryPickContinue = true;
      },
      gitCherryPickAbort: () => {
        called.cherryPickAbort = true;
      },
    };

    rebaseInteractive?.run(mockCtx);
    expect(called.rebaseInteractive).toBe(true);

    rebaseContinue?.run(mockCtx);
    expect(called.rebaseContinue).toBe(true);

    rebaseAbort?.run(mockCtx);
    expect(called.rebaseAbort).toBe(true);

    cp?.run(mockCtx);
    expect(called.cherryPick).toBe(true);

    cpContinue?.run(mockCtx);
    expect(called.cherryPickContinue).toBe(true);

    cpAbort?.run(mockCtx);
    expect(called.cherryPickAbort).toBe(true);
  });
});
