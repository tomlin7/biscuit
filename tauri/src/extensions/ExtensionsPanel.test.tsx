import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  ExtensionsPanel,
  isNewer,
  copyToClipboard,
  type ExtensionsPanelProps,
} from "./ExtensionsPanel";
import {
  ExtensionsContext,
  type ExtensionManifest,
  type RegistryExtension,
  type ExtensionsState,
} from "./ExtensionsContext";

const sampleExtensions: ExtensionManifest[] = [
  {
    id: "t3d.vim",
    name: "Vim Keymap",
    version: "1.0.0",
    description: "Modal editing and motions for T3D editor.",
    enabled: true,
    globallyEnabled: true,
    workspaceDisabled: false,
    path: "/path/to/extensions/t3d.vim",
    main: "dist/index.js",
    permissions: ["workspace:read", "editor:commands"],
    contributes: {
      commands: [
        { id: "vim.toggle", title: "Toggle Vim Mode" },
        { id: "vim.normalMode", title: "Enter Normal Mode" },
      ],
    },
  },
  {
    id: "t3d.theme-dracula",
    name: "Dracula Official Theme",
    version: "2.1.0",
    description: "Famous dark theme for coding vampires.",
    enabled: false,
    globallyEnabled: false,
    workspaceDisabled: true,
    path: "/path/to/extensions/t3d.theme-dracula",
    permissions: [],
  },
  {
    id: "t3d.rust-analyzer",
    name: "Rust Analyzer LSP",
    version: "0.8.0",
    description: "High-performance Rust language server and linter integration.",
    enabled: true,
    globallyEnabled: true,
    workspaceDisabled: false,
    path: "/path/to/extensions/t3d.rust-analyzer",
    permissions: ["fs:all", "shell:execute"],
  },
];

const sampleRegistry: RegistryExtension[] = [
  {
    id: "t3d.vim",
    name: "Vim Keymap",
    version: "1.2.0", // newer than local 1.0.0 -> update available!
    description: "Modal editing and motions for T3D editor.",
    downloadUrl: "https://marketplace.t3d.dev/vim-1.2.0.zip",
  },
  {
    id: "t3d.gitlens",
    name: "GitLens Inspect",
    version: "3.0.0",
    description: "Supercharge Git within T3D with blame annotations.",
    downloadUrl: "https://marketplace.t3d.dev/gitlens-3.0.0.zip",
  },
];

function createMockState(overrides?: Partial<ExtensionsState>): ExtensionsState {
  return {
    extensions: sampleExtensions,
    loading: false,
    error: null,
    registry: sampleRegistry,
    registryLoading: false,
    registryError: null,
    refresh: async () => sampleExtensions,
    fetchRegistry: async () => sampleRegistry,
    setEnabled: async () => {},
    isWorkspaceDisabled: () => false,
    toggleWorkspaceEnablement: () => {},
    installSample: async () => {},
    installFromFolder: async () => {},
    installFromRegistry: async () => {},
    scaffoldInFolder: async () => {},
    uninstall: async () => {},
    ...overrides,
  };
}

function renderPanelWithState(state: ExtensionsState, props?: ExtensionsPanelProps) {
  return renderToString(
    <ExtensionsContext.Provider value={state}>
      <ExtensionsPanel {...props} />
    </ExtensionsContext.Provider>,
  );
}

describe("ExtensionsPanel Version Comparison (isNewer)", () => {
  it("correctly identifies when remote version is newer", () => {
    expect(isNewer("1.2.0", "1.0.0")).toBe(true);
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
    expect(isNewer("1.0.1", "1.0.0")).toBe(true);
  });

  it("handles 'v' prefix in version numbers gracefully", () => {
    expect(isNewer("v1.2.0", "1.0.0")).toBe(true);
    expect(isNewer("1.2.0", "v1.0.0")).toBe(true);
    expect(isNewer("v2.0.0", "v1.9.9")).toBe(true);
  });

  it("returns false when versions are identical or remote is older", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
    expect(isNewer("v1.0.0", "1.0.0")).toBe(false);
    expect(isNewer("1.0.0", "1.2.0")).toBe(false);
    expect(isNewer("0.9.0", "1.0.0")).toBe(false);
  });
});

describe("ExtensionsPanel Clipboard Fallback", () => {
  it("calls navigator.clipboard.writeText when available and resolves", async () => {
    const origClipboard = globalThis.navigator?.clipboard;
    let written = "";
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: {
        writeText: async (t: string) => {
          written = t;
        },
      },
      configurable: true,
    });

    const res = await copyToClipboard("t3d.vim");
    expect(res).toBe(true);
    expect(written).toBe("t3d.vim");

    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: origClipboard,
      configurable: true,
    });
  });

  it("falls back to document.execCommand when navigator.clipboard.writeText throws", async () => {
    const origClipboard = globalThis.navigator?.clipboard;
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
      configurable: true,
    });

    let execCommandCalledWith = "";
    const origExec = (globalThis as any).document?.execCommand;
    if (typeof (globalThis as any).document === "undefined") {
      (globalThis as any).document = {
        createElement: () => ({
          style: {},
          setAttribute: () => {},
          focus: () => {},
          select: () => {},
        }),
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
        execCommand: (cmd: string) => {
          execCommandCalledWith = cmd;
          return true;
        },
      };
    } else {
      (globalThis as any).document.execCommand = (cmd: string) => {
        execCommandCalledWith = cmd;
        return true;
      };
    }

    const res = await copyToClipboard("t3d.theme-dracula");
    expect(res).toBe(true);
    expect(execCommandCalledWith).toBe("copy");

    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: origClipboard,
      configurable: true,
    });
    if (origExec) {
      (globalThis as any).document.execCommand = origExec;
    }
  });
});

describe("ExtensionsPanel UI & Structure", () => {
  it("renders streamlined unbloated header, search bar, and category filter pills", () => {
    const html = renderPanelWithState(createMockState());

    // Header title
    expect(html).toContain("Extensions");
    // Action icon buttons in header
    expect(html).toContain('title="Refresh extensions"');
    expect(html).toContain('title="Install from folder"');
    expect(html).toContain('title="Scaffold new extension"');
    expect(html).toContain('title="Install sample extension"');

    // Search bar
    expect(html).toContain('placeholder="Search installed…"');

    // Category pills with counts
    expect(html).toContain("Installed");
    expect(html).toContain('<span class="ext-panel__pill-count">3</span>');
    expect(html).toContain("Marketplace");
    expect(html).toContain('<span class="ext-panel__pill-count">2</span>');
    expect(html).toContain("Updates");
    // 1 update available (t3d.vim is 1.0.0 locally, 1.2.0 in registry)
    expect(html).toContain("ext-panel__pill--has-updates");

    // Clean ARIA tabs group separating role="tablist" from checkbox filter chip
    expect(html).toContain('role="tablist"');
    expect(html).toContain('class="ext-panel__tabs-group"');

    // Filter chip for enabled
    expect(html).toContain("Enabled");
    expect(html).toContain('<span class="ext-panel__filter-count">2</span>');
  });

  it("renders compact extension rows with metadata, tags, and micro toggle switch", () => {
    const html = renderPanelWithState(createMockState());

    // Extensions rendered
    expect(html).toContain("Vim Keymap");
    expect(html).toContain("v1.0.0");
    expect(html).toContain("Modal editing and motions for T3D editor.");
    expect(html).toContain("Dracula Official Theme");
    expect(html).toContain("v2.1.0");
    expect(html).toContain("Rust Analyzer LSP");
    expect(html).toContain("v0.8.0");

    // Status / tags
    expect(html).toContain("2p"); // 2 permissions tag
    expect(html).toContain("2c"); // 2 commands tag
    expect(html).toContain("WS Off"); // Workspace disabled badge for Dracula

    // Accessible toggle switch with role="switch"
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Toggle Vim Keymap"');
    expect(html).toContain("ext-panel__switch--checked");

    // Keyboard accessible row with aria-expanded
    expect(html).toContain('aria-expanded="false"');
  });

  it("filters installed extensions by search query", () => {
    const html = renderPanelWithState(createMockState(), {
      initialQuery: "rust",
    });

    expect(html).toContain("Rust Analyzer LSP");
    expect(html).not.toContain("Vim Keymap");
    expect(html).not.toContain("Dracula Official Theme");
    expect(html).toContain('aria-label="Clear search"');
  });

  it("renders empty state when search query matches nothing", () => {
    const html = renderPanelWithState(createMockState(), {
      initialQuery: "non-existent-extension-query",
    });

    expect(html).toContain("No extensions match");
    expect(html).toContain("non-existent-extension-query");
    expect(html).toContain("Clear Search");
  });

  it("renders custom empty state when enabledOnly filter leaves no matches", () => {
    const disabledState = createMockState({
      extensions: [
        {
          id: "t3d.disabled-one",
          name: "Disabled One",
          version: "1.0.0",
          description: "A disabled extension",
          enabled: false,
          globallyEnabled: false,
          workspaceDisabled: false,
          path: "/path",
        },
      ],
    });

    const html = renderPanelWithState(disabledState, {
      initialEnabledOnly: true,
      initialQuery: "",
    });

    expect(html).toContain("No enabled extensions");
    expect(html).toContain("All installed extensions are currently disabled.");
    expect(html).toContain("Show All");
  });

  it("filters by enabledOnly chip in installed view", () => {
    const html = renderPanelWithState(createMockState(), {
      initialEnabledOnly: true,
    });

    // Enabled extensions
    expect(html).toContain("Vim Keymap");
    expect(html).toContain("Rust Analyzer LSP");
    // Dracula is disabled -> must not appear
    expect(html).not.toContain("Dracula Official Theme");
  });

  it("renders update badge and button for installed extensions with updates", () => {
    const html = renderPanelWithState(createMockState());

    // t3d.vim has remote 1.2.0 > local 1.0.0
    expect(html).toContain("Update to v1.2.0");
    expect(html).toContain("ext-panel__btn--update");
  });

  it("renders marketplace tab with items, status badges, and install buttons", () => {
    const html = renderPanelWithState(createMockState(), {
      initialTab: "marketplace",
    });

    // Marketplace search placeholder
    expect(html).toContain('placeholder="Search marketplace…"');

    // Marketplace items
    expect(html).toContain("Vim Keymap");
    expect(html).toContain("v1.2.0");
    // Vim is already installed
    expect(html).toContain("ext-panel__badge--installed");

    // GitLens is NOT installed -> shows Install button
    expect(html).toContain("GitLens Inspect");
    expect(html).toContain("v3.0.0");
    expect(html).toContain("Supercharge Git within T3D with blame annotations.");
    expect(html).toContain("Install");
  });

  it("renders updates tab with available updates and Update All banner", () => {
    const html = renderPanelWithState(createMockState(), {
      initialTab: "updates",
    });

    // Update banner
    expect(html).toContain("1 update available");
    expect(html).toContain("Update All");

    // Vim update row
    expect(html).toContain("Vim Keymap");
    expect(html).toContain("v1.0.0");
    expect(html).toContain("→ v1.2.0");
  });

  it("renders all up-to-date empty state in updates tab when no updates exist", () => {
    const upToDateRegistry: RegistryExtension[] = [
      {
        id: "t3d.vim",
        name: "Vim Keymap",
        version: "1.0.0", // Same version
        downloadUrl: "https://marketplace.t3d.dev/vim-1.0.0.zip",
      },
    ];

    const html = renderPanelWithState(
      createMockState({ registry: upToDateRegistry }),
      { initialTab: "updates" },
    );

    expect(html).toContain("All extensions up to date");
    expect(html).toContain("Installed extensions are running their latest versions.");
  });

  it("renders detail inspection drawer with status and global/workspace actions", () => {
    const html = renderPanelWithState(createMockState(), {
      initialInspectedId: "t3d.vim",
    });

    // Inspector region
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Details for Vim Keymap"');

    // Extension details
    expect(html).toContain("t3d.vim");
    expect(html).toContain("/path/to/extensions/t3d.vim");
    expect(html).toContain("dist/index.js");

    // Status indicator
    expect(html).toContain("Status:");

    // Permissions chips
    expect(html).toContain("workspace:read");
    expect(html).toContain("editor:commands");

    // Contributed commands list
    expect(html).toContain("Commands (2):");
    expect(html).toContain("Toggle Vim Mode");
    expect(html).toContain("vim.toggle");
    expect(html).toContain("Enter Normal Mode");
    expect(html).toContain("vim.normalMode");

    // Actions
    expect(html).toContain("Disable (Global)");
    expect(html).toContain("Disable for Workspace");
    expect(html).toContain("Uninstall");
  });

  it("renders empty state when no extensions are installed", () => {
    const html = renderPanelWithState(
      createMockState({
        extensions: [],
      }),
    );

    expect(html).toContain("No extensions installed");
    expect(html).toContain("Browse marketplace or install from a local folder.");
  });

  it("renders loading hint when loading is active", () => {
    const html = renderPanelWithState(
      createMockState({
        loading: true,
      }),
    );

    expect(html).toContain("Loading extensions…");
  });

  it("renders error message banner when error occurs", () => {
    const html = renderPanelWithState(
      createMockState({
        error: "Failed to read extension directory: access denied",
      }),
    );

    expect(html).toContain("Failed to read extension directory: access denied");
    expect(html).toContain("ext-panel__banner-error");
  });
});
