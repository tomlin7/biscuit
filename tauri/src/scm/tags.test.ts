import { describe, expect, test } from "bun:test";
import {
  validateTagName,
  formatTagCommit,
  formatTagDate,
  filterTags,
  copyTagNameToClipboard,
  fetchGitTags,
  createGitTag,
  deleteGitTag,
  pushGitTags,
  deleteRemoteGitTag,
  type GitTagInfo,
} from "./tags";
import { COMMANDS } from "../commands/registry";

describe("Git Tags Frontend helpers", () => {
  test("validates tag names correctly", () => {
    expect(validateTagName("v1.0.0").valid).toBe(true);
    expect(validateTagName("release-2026.11").valid).toBe(true);
    expect(validateTagName("feature/v1").valid).toBe(true);
    expect(validateTagName("v2.1-rc1").valid).toBe(true);

    // Empty or @
    expect(validateTagName("").valid).toBe(false);
    expect(validateTagName("   ").valid).toBe(false);
    expect(validateTagName("@").valid).toBe(false);

    // Dashes or dots at boundaries
    expect(validateTagName("-v1").valid).toBe(false);
    expect(validateTagName(".v1").valid).toBe(false);
    expect(validateTagName("v1.").valid).toBe(false);
    expect(validateTagName("v1.lock").valid).toBe(false);

    // Slashes
    expect(validateTagName("/v1").valid).toBe(false);
    expect(validateTagName("v1/").valid).toBe(false);
    expect(validateTagName("v1//v2").valid).toBe(false);
    expect(validateTagName("foo/.bar").valid).toBe(false);
    expect(validateTagName("foo/bar.lock").valid).toBe(false);

    // Whitespace and control chars
    expect(validateTagName("v1 0").valid).toBe(false);
    expect(validateTagName("v1\t0").valid).toBe(false);
    expect(validateTagName("v1\x070").valid).toBe(false);

    // Illegal Git ref characters
    expect(validateTagName("v1~1").valid).toBe(false);
    expect(validateTagName("v1^1").valid).toBe(false);
    expect(validateTagName("v1:1").valid).toBe(false);
    expect(validateTagName("v1?1").valid).toBe(false);
    expect(validateTagName("v1*1").valid).toBe(false);
    expect(validateTagName("v1[1").valid).toBe(false);
    expect(validateTagName("v1\\1").valid).toBe(false);
    expect(validateTagName("v1..2").valid).toBe(false);
    expect(validateTagName("v1@{1}").valid).toBe(false);
  });

  test("formats tag commit hashes and dates cleanly", () => {
    expect(formatTagCommit("7b1c6248d69288fbee4904")).toBe("7b1c624");
    expect(formatTagCommit("1234567")).toBe("1234567");
    expect(formatTagCommit("abc")).toBe("abc");
    expect(formatTagCommit(null)).toBe("—");
    expect(formatTagCommit(undefined)).toBe("—");
    expect(formatTagCommit("")).toBe("—");
    expect(formatTagCommit("   ")).toBe("—");

    expect(formatTagDate("2026-11-10")).toBe("2026-11-10");
    expect(formatTagDate(null)).toBe("—");
    expect(formatTagDate(undefined)).toBe("—");
    expect(formatTagDate("")).toBe("—");
    expect(formatTagDate("   ")).toBe("—");
  });

  test("filters tags by query matching name, commit, or message", () => {
    const tags: GitTagInfo[] = [
      {
        name: "v1.0.0",
        commit: "7b1c624",
        annotated: true,
        message: "First stable release",
        date: "2026-10-19",
      },
      {
        name: "v1.1.0-alpha",
        commit: "50e4fa1",
        annotated: false,
        message: null,
        date: "2026-11-01",
      },
      {
        name: "hotfix-security",
        commit: "9876543",
        annotated: true,
        message: "Patch auth vulnerability",
        date: "2026-11-05",
      },
    ];

    expect(filterTags(tags, "")).toEqual(tags);
    expect(filterTags(tags, "v1.0")).toHaveLength(1);
    expect(filterTags(tags, "v1.0")[0].name).toBe("v1.0.0");

    expect(filterTags(tags, "alpha")).toHaveLength(1);
    expect(filterTags(tags, "alpha")[0].name).toBe("v1.1.0-alpha");

    expect(filterTags(tags, "9876543")).toHaveLength(1);
    expect(filterTags(tags, "9876543")[0].name).toBe("hotfix-security");

    expect(filterTags(tags, "vulnerability")).toHaveLength(1);
    expect(filterTags(tags, "vulnerability")[0].name).toBe("hotfix-security");

    expect(filterTags(tags, "nonexistent")).toHaveLength(0);
  });

  test("invokes backend git tag Tauri commands", async () => {
    const originalWindow = (globalThis as any).window;
    const calls: Array<{ cmd: string; args: any }> = [];
    try {
      (globalThis as any).window = {
        location: { href: "http://localhost" },
        __TAURI_INTERNALS__: {
          invoke: async (cmd: string, args: any) => {
            calls.push({ cmd, args });
            if (cmd === "git_tags") {
              return [
                {
                  name: "v1.0.0",
                  commit: "7b1c624",
                  annotated: true,
                  message: "Initial release",
                  date: "2026-11-10",
                },
              ];
            }
            if (cmd === "git_create_tag") return null;
            if (cmd === "git_delete_tag") return null;
            if (cmd === "git_push_tags") return null;
            if (cmd === "git_delete_remote_tag") return null;
            return null;
          },
        },
      };

      const tags = await fetchGitTags("/repo");
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("v1.0.0");
      expect(calls[0]).toEqual({ cmd: "git_tags", args: { root: "/repo" } });

      await createGitTag("/repo", "v1.1.0", "HEAD", "Version 1.1.0");
      expect(calls[1]).toEqual({
        cmd: "git_create_tag",
        args: {
          root: "/repo",
          name: "v1.1.0",
          target: "HEAD",
          message: "Version 1.1.0",
        },
      });

      await createGitTag("/repo", "v1.2.0-lw", null, null);
      expect(calls[2]).toEqual({
        cmd: "git_create_tag",
        args: {
          root: "/repo",
          name: "v1.2.0-lw",
          target: null,
          message: null,
        },
      });

      await deleteGitTag("/repo", "v1.1.0");
      expect(calls[3]).toEqual({
        cmd: "git_delete_tag",
        args: { root: "/repo", name: "v1.1.0" },
      });

      await pushGitTags("/repo", "origin");
      expect(calls[4]).toEqual({
        cmd: "git_push_tags",
        args: { root: "/repo", remote: "origin" },
      });

      await deleteRemoteGitTag("/repo", "v1.0.0", "origin");
      expect(calls[5]).toEqual({
        cmd: "git_delete_remote_tag",
        args: { root: "/repo", name: "v1.0.0", remote: "origin" },
      });
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });

  test("registers git tag commands in COMMANDS registry", () => {
    const createCmd = COMMANDS.find((c) => c.id === "git.tag.create");
    expect(createCmd).toBeDefined();
    expect(createCmd?.title).toBe("Git: Create Tag");
    expect(createCmd?.category).toBe("Git");

    const deleteCmd = COMMANDS.find((c) => c.id === "git.tag.delete");
    expect(deleteCmd).toBeDefined();
    expect(deleteCmd?.title).toBe("Git: Delete Tag");
    expect(deleteCmd?.category).toBe("Git");

    const pushCmd = COMMANDS.find((c) => c.id === "git.tag.push");
    expect(pushCmd).toBeDefined();
    expect(pushCmd?.title).toBe("Git: Push Tags");
    expect(pushCmd?.category).toBe("Git");

    let createCalled = false;
    let deleteCalled = false;
    let pushCalled = false;

    const mockCtx: any = {
      gitTagCreate: () => {
        createCalled = true;
      },
      gitTagDelete: () => {
        deleteCalled = true;
      },
      gitTagPush: () => {
        pushCalled = true;
      },
    };

    createCmd?.run(mockCtx);
    expect(createCalled).toBe(true);

    deleteCmd?.run(mockCtx);
    expect(deleteCalled).toBe(true);

    pushCmd?.run(mockCtx);
    expect(pushCalled).toBe(true);
  });

  test("copies tag name to clipboard with fallback", async () => {
    const originalNavigator = globalThis.navigator;
    const originalDocument = globalThis.document;

    try {
      // 1. Success via navigator.clipboard.writeText
      let written = "";
      (globalThis as any).navigator = {
        clipboard: {
          writeText: async (text: string) => {
            written = text;
          },
        },
      };

      const res1 = await copyTagNameToClipboard("v1.0.0");
      expect(res1).toBe(true);
      expect(written).toBe("v1.0.0");

      // 2. Fallback via document.execCommand when writeText throws
      (globalThis as any).navigator = {
        clipboard: {
          writeText: async () => {
            throw new Error("clipboard denied");
          },
        },
      };

      let execCmdCalled = "";
      let appendedNode: any = null;
      (globalThis as any).document = {
        createElement: (tag: string) => ({
          tagName: tag,
          value: "",
          style: {},
          setAttribute: () => {},
          focus: () => {},
          select: () => {},
        }),
        body: {
          appendChild: (node: any) => {
            appendedNode = node;
          },
          removeChild: () => {},
        },
        execCommand: (cmd: string) => {
          execCmdCalled = cmd;
          return true;
        },
      };

      const res2 = await copyTagNameToClipboard("v2.0.0");
      expect(res2).toBe(true);
      expect(execCmdCalled).toBe("copy");
      expect(appendedNode?.value).toBe("v2.0.0");
    } finally {
      (globalThis as any).navigator = originalNavigator;
      (globalThis as any).document = originalDocument;
    }
  });
});
