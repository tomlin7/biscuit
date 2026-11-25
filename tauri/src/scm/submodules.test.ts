import { describe, expect, test } from "bun:test";
import {
  formatSubmoduleStatus,
  formatSubmoduleCommit,
  fetchGitSubmodules,
  initGitSubmodule,
  updateGitSubmodule,
  syncGitSubmodules,
  type GitSubmoduleInfo,
} from "./submodules";
import { COMMANDS } from "../commands/registry";

describe("Git Submodules Frontend helpers", () => {
  test("formats submodule statuses accurately with appropriate badge classes", () => {
    const uninit = formatSubmoduleStatus("uninitialized");
    expect(uninit.label).toBe("uninitialized");
    expect(uninit.badgeClass).toBe("scm-panel__submodule-badge--uninitialized");

    const modified = formatSubmoduleStatus("modified");
    expect(modified.label).toBe("modified");
    expect(modified.badgeClass).toBe("scm-panel__submodule-badge--modified");

    const conflict = formatSubmoduleStatus("conflict");
    expect(conflict.label).toBe("conflict");
    expect(conflict.badgeClass).toBe("scm-panel__submodule-badge--conflict");

    const unmerged = formatSubmoduleStatus("unmerged");
    expect(unmerged.label).toBe("conflict");
    expect(unmerged.badgeClass).toBe("scm-panel__submodule-badge--conflict");

    const upToDate = formatSubmoduleStatus("up-to-date");
    expect(upToDate.label).toBe("up-to-date");
    expect(upToDate.badgeClass).toBe("scm-panel__submodule-badge--up-to-date");

    // Case-insensitivity test
    const mixedCase = formatSubmoduleStatus("UnInitialized");
    expect(mixedCase.label).toBe("uninitialized");
    expect(mixedCase.badgeClass).toBe("scm-panel__submodule-badge--uninitialized");

    const unknownFallback = formatSubmoduleStatus("other");
    expect(unknownFallback.label).toBe("up-to-date");
    expect(unknownFallback.badgeClass).toBe("scm-panel__submodule-badge--up-to-date");
  });

  test("formats submodule commit hashes cleanly", () => {
    expect(formatSubmoduleCommit("4b825dc642cb6eb9a060e54bf8d69288fbee4904")).toBe("4b825dc");
    expect(formatSubmoduleCommit("1234567")).toBe("1234567");
    expect(formatSubmoduleCommit("abc")).toBe("abc");
    expect(formatSubmoduleCommit(null)).toBe("—");
    expect(formatSubmoduleCommit(undefined)).toBe("—");
    expect(formatSubmoduleCommit("")).toBe("—");
    expect(formatSubmoduleCommit("   ")).toBe("—");
  });

  test("validates GitSubmoduleInfo objects", () => {
    const sub: GitSubmoduleInfo = {
      name: "vendor/lib",
      path: "vendor/lib",
      url: "https://github.com/example/lib.git",
      head_commit: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
      status: "up-to-date",
    };
    expect(sub.name).toBe("vendor/lib");
    expect(sub.path).toBe("vendor/lib");
    expect(sub.url).toContain("https://");
    expect(formatSubmoduleCommit(sub.head_commit)).toBe("4b825dc");
    expect(formatSubmoduleStatus(sub.status).label).toBe("up-to-date");
  });

  test("invokes backend git submodule Tauri commands", async () => {
    const originalWindow = (globalThis as any).window;
    const calls: Array<{ cmd: string; args: any }> = [];
    try {
      (globalThis as any).window = {
        location: { href: "http://localhost" },
        __TAURI_INTERNALS__: {
          invoke: async (cmd: string, args: any) => {
            calls.push({ cmd, args });
            if (cmd === "git_submodules") {
              return [
                {
                  name: "sub1",
                  path: "libs/sub1",
                  url: "https://git.example.com/sub1.git",
                  head_commit: "abc1234567",
                  status: "up-to-date",
                },
              ];
            }
            if (cmd === "git_submodule_init") return "Initialized submodule libs/sub1";
            if (cmd === "git_submodule_update") return "Updated submodule libs/sub1";
            if (cmd === "git_submodule_sync") return "Synchronized submodule libs/sub1";
            return null;
          },
        },
      };

      const subs = await fetchGitSubmodules("/repo");
      expect(subs).toHaveLength(1);
      expect(subs[0].name).toBe("sub1");
      expect(calls[0]).toEqual({ cmd: "git_submodules", args: { root: "/repo" } });

      const initOut = await initGitSubmodule("/repo", "libs/sub1");
      expect(initOut).toContain("Initialized");
      expect(calls[1]).toEqual({ cmd: "git_submodule_init", args: { root: "/repo", path: "libs/sub1" } });

      const updateOut = await updateGitSubmodule("/repo", "libs/sub1", true);
      expect(updateOut).toContain("Updated");
      expect(calls[2]).toEqual({
        cmd: "git_submodule_update",
        args: { root: "/repo", path: "libs/sub1", recursive: true },
      });

      const syncOut = await syncGitSubmodules("/repo", true);
      expect(syncOut).toContain("Synchronized");
      expect(calls[3]).toEqual({
        cmd: "git_submodule_sync",
        args: { root: "/repo", recursive: true },
      });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });

  test("registers git submodule commands in COMMANDS registry", () => {
    const updateAll = COMMANDS.find((c) => c.id === "git.submodule.updateAll");
    expect(updateAll).toBeDefined();
    expect(updateAll?.title).toBe("Git: Submodule Update (Recursive)");
    expect(updateAll?.category).toBe("Git");

    const initAll = COMMANDS.find((c) => c.id === "git.submodule.initAll");
    expect(initAll).toBeDefined();
    expect(initAll?.title).toBe("Git: Submodule Init");
    expect(initAll?.category).toBe("Git");

    const syncAll = COMMANDS.find((c) => c.id === "git.submodule.syncAll");
    expect(syncAll).toBeDefined();
    expect(syncAll?.title).toBe("Git: Submodule Sync");
    expect(syncAll?.category).toBe("Git");

    let updateCalled = false;
    let initCalled = false;
    let syncCalled = false;

    const mockCtx: any = {
      gitSubmoduleUpdateAll: () => {
        updateCalled = true;
      },
      gitSubmoduleInitAll: () => {
        initCalled = true;
      },
      gitSubmoduleSyncAll: () => {
        syncCalled = true;
      },
    };

    updateAll?.run(mockCtx);
    expect(updateCalled).toBe(true);

    initAll?.run(mockCtx);
    expect(initCalled).toBe(true);

    syncAll?.run(mockCtx);
    expect(syncCalled).toBe(true);
  });
});
