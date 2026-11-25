import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  THEME_COLOR_SLOTS,
  THEME_PRESETS,
  isValidHexColor,
  normalizeHex,
  slugifyThemeId,
  loadCustomThemes,
  saveCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  getCustomTheme,
  exportCustomThemeJson,
  importCustomThemeFromJson,
  applyCustomThemeCss,
  stripJsonComments,
  type CustomThemeDefinition,
} from "./customTheme";
import { monacoThemeId, defineCustomThemes } from "../editor/theme";
import { collectContributions } from "../extensions/contributions";
import { ThemeEditor } from "./ThemeEditor";
import { ThemeProvider } from "./ThemeContext";
import { COMMANDS } from "../commands/registry";

// Mock localStorage for storage tests
const mockLocalStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockLocalStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key];
  },
  clear: () => {
    for (const k in mockLocalStorage) delete mockLocalStorage[k];
  },
  key: (index: number) => Object.keys(mockLocalStorage)[index] ?? null,
  length: 0,
} as any;

describe("Theme Color Slots and Presets", () => {
  it("defines all 12 required key slots across editor and chrome categories", () => {
    const slotKeys = THEME_COLOR_SLOTS.map((s) => s.key);
    expect(slotKeys).toContain("editor.background");
    expect(slotKeys).toContain("editor.foreground");
    expect(slotKeys).toContain("editor.lineHighlightBackground");
    expect(slotKeys).toContain("editor.selectionBackground");
    expect(slotKeys).toContain("activityBar.background");
    expect(slotKeys).toContain("activityBar.foreground");
    expect(slotKeys).toContain("sideBar.background");
    expect(slotKeys).toContain("sideBar.foreground");
    expect(slotKeys).toContain("statusBar.background");
    expect(slotKeys).toContain("statusBar.foreground");
    expect(slotKeys).toContain("accent");
    expect(slotKeys).toContain("border");

    const editorSlots = THEME_COLOR_SLOTS.filter((s) => s.category === "editor");
    const chromeSlots = THEME_COLOR_SLOTS.filter((s) => s.category === "chrome");
    expect(editorSlots.length).toBe(4);
    expect(chromeSlots.length).toBe(8);
  });

  it("provides built-in presets covering Dark, Light, Gruvbox, and Catppuccin", () => {
    expect(THEME_PRESETS.dark).toBeDefined();
    expect(THEME_PRESETS.light).toBeDefined();
    expect(THEME_PRESETS.gruvbox).toBeDefined();
    expect(THEME_PRESETS.catppuccin).toBeDefined();

    for (const key of ["dark", "light", "gruvbox", "catppuccin"] as const) {
      const preset = THEME_PRESETS[key];
      expect(preset.label).toBeTruthy();
      expect(preset.uiTheme).toBe(key === "light" ? "vs" : "vs-dark");
      for (const slot of THEME_COLOR_SLOTS) {
        expect(preset.colors[slot.key]).toBeDefined();
        expect(isValidHexColor(preset.colors[slot.key])).toBe(true);
      }
    }
  });
});

describe("Color Manipulation and Slug Utilities", () => {
  it("validates 3, 6, and 8 character hex strings correctly", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#123456")).toBe(true);
    expect(isValidHexColor("#12345678")).toBe(true);
    expect(isValidHexColor("  #3b82f6  ")).toBe(true);
    expect(isValidHexColor("invalid")).toBe(false);
    expect(isValidHexColor("rgb(0,0,0)")).toBe(false);
    expect(isValidHexColor("#12")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });

  it("normalizes hex colors to 6-digit lowercase format for HTML5 color pickers", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("#3B82F6")).toBe("#3b82f6");
    expect(normalizeHex("#123456ff")).toBe("#123456");
    expect(normalizeHex("bad-color", "#141414")).toBe("#141414");
    expect(normalizeHex("", "#000000")).toBe("#000000");
  });

  it("slugifies theme labels to safe IDs", () => {
    expect(slugifyThemeId("My Awesome Theme")).toBe("my-awesome-theme");
    expect(slugifyThemeId(" Gruvbox Warm (Dark) ")).toBe("gruvbox-warm-dark");
    expect(slugifyThemeId("---theme---")).toBe("theme");
    expect(slugifyThemeId("")).toBe("custom-theme");
  });
});

describe("Custom Theme Persistence in LocalStorage", () => {
  it("returns an empty array when no custom themes exist", () => {
    localStorage.clear();
    expect(loadCustomThemes()).toEqual([]);
  });

  it("saves and loads custom themes from localStorage", () => {
    localStorage.clear();
    const sampleTheme: CustomThemeDefinition = {
      id: "ocean-breeze",
      label: "Ocean Breeze",
      uiTheme: "vs-dark",
      colors: { ...THEME_PRESETS.dark.colors, accent: "#00b4d8" },
    };

    saveCustomThemes([sampleTheme]);
    expect(loadCustomThemes().length).toBe(1);

    saveCustomTheme(sampleTheme);
    const loaded = loadCustomThemes();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe("ocean-breeze");
    expect(loaded[0].colors.accent).toBe("#00b4d8");

    const retrieved = getCustomTheme("ocean-breeze");
    expect(retrieved?.label).toBe("Ocean Breeze");

    const retrievedWithPrefix = getCustomTheme("custom:ocean-breeze");
    expect(retrievedWithPrefix?.label).toBe("Ocean Breeze");
  });

  it("updates an existing custom theme when saved with the same ID", () => {
    localStorage.clear();
    const themeA: CustomThemeDefinition = {
      id: "cyberpunk",
      label: "Cyberpunk",
      uiTheme: "vs-dark",
      colors: { ...THEME_PRESETS.dark.colors, accent: "#ff007f" },
    };
    saveCustomTheme(themeA);

    const themeAUpdated: CustomThemeDefinition = {
      ...themeA,
      label: "Cyberpunk Neon",
      colors: { ...themeA.colors, accent: "#00ffff" },
    };
    saveCustomTheme(themeAUpdated);

    const list = loadCustomThemes();
    expect(list.length).toBe(1);
    expect(list[0].label).toBe("Cyberpunk Neon");
    expect(list[0].colors.accent).toBe("#00ffff");
  });

  it("deletes a custom theme by ID", () => {
    localStorage.clear();
    const theme1: CustomThemeDefinition = {
      id: "theme-1",
      label: "Theme 1",
      uiTheme: "vs-dark",
      colors: { ...THEME_PRESETS.dark.colors },
    };
    const theme2: CustomThemeDefinition = {
      id: "theme-2",
      label: "Theme 2",
      uiTheme: "vs-dark",
      colors: { ...THEME_PRESETS.dark.colors },
    };
    saveCustomTheme(theme1);
    saveCustomTheme(theme2);
    expect(loadCustomThemes().length).toBe(2);

    deleteCustomTheme("theme-1");
    const remaining = loadCustomThemes();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("theme-2");
  });
});

describe("JSON Export and Import", () => {
  it("exports custom theme matching extension contributes.themes schema", () => {
    const theme: CustomThemeDefinition = {
      id: "nord-frost",
      label: "Nord Frost",
      uiTheme: "vs-dark",
      colors: {
        ...THEME_PRESETS.dark.colors,
        "editor.background": "#2e3440",
        accent: "#88c0d0",
      },
    };

    const json = exportCustomThemeJson(theme);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("nord-frost");
    expect(parsed.label).toBe("Nord Frost");
    expect(parsed.uiTheme).toBe("vs-dark");
    expect(parsed.colors["editor.background"]).toBe("#2e3440");
    expect(parsed.colors["accent"]).toBe("#88c0d0");
  });

  it("imports standard contributes.themes format", () => {
    const json = JSON.stringify({
      id: "dracula-pro",
      label: "Dracula Pro",
      uiTheme: "vs-dark",
      colors: {
        "editor.background": "#282a36",
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#44475a",
        "editor.selectionBackground": "#44475a",
        "activityBar.background": "#1e1f29",
        "activityBar.foreground": "#f8f8f2",
        "sideBar.background": "#21222c",
        "sideBar.foreground": "#f8f8f2",
        "statusBar.background": "#191a21",
        "statusBar.foreground": "#f8f8f2",
        accent: "#bd93f9",
        border: "#6272a4",
      },
    });

    const imported = importCustomThemeFromJson(json);
    expect(imported.id).toBe("dracula-pro");
    expect(imported.label).toBe("Dracula Pro");
    expect(imported.uiTheme).toBe("vs-dark");
    expect(imported.colors["editor.background"]).toBe("#282a36");
    expect(imported.colors.accent).toBe("#bd93f9");
  });

  it("imports from extension manifest structure with contributes.themes array", () => {
    const manifestJson = JSON.stringify({
      name: "theme-pack",
      contributes: {
        themes: [
          {
            id: "solarized-light",
            label: "Solarized Light",
            uiTheme: "vs",
            colors: {
              "editor.background": "#fdf6e3",
              "editor.foreground": "#657b83",
              accent: "#268bd2",
            },
          },
        ],
      },
    });

    const imported = importCustomThemeFromJson(manifestJson);
    expect(imported.id).toBe("solarized-light");
    expect(imported.label).toBe("Solarized Light");
    expect(imported.uiTheme).toBe("vs");
    expect(imported.colors["editor.background"]).toBe("#fdf6e3");
  });

  it("normalizes camelCase and short color keys on import", () => {
    const looseJson = JSON.stringify({
      label: "Loose Colors Theme",
      mode: "light",
      colors: {
        editorBackground: "#ffffff",
        editorForeground: "#111111",
        selection: "#bcdffe",
        sidebarBackground: "#f5f5f5",
        accent: "#007acc",
      },
    });

    const imported = importCustomThemeFromJson(looseJson);
    expect(imported.uiTheme).toBe("vs");
    expect(imported.colors["editor.background"]).toBe("#ffffff");
    expect(imported.colors["editor.foreground"]).toBe("#111111");
    expect(imported.colors["editor.selectionBackground"]).toBe("#bcdffe");
    expect(imported.colors["sideBar.background"]).toBe("#f5f5f5");
  });

  it("strips single-line and multi-line comments and trailing commas from JSONC", () => {
    const rawJsonc = `
      // VS Code theme header comment
      {
        /* Block comment describing theme */
        "name": "Synthwave Glow",
        "type": "dark",
        "colors": {
          "editor.background": "#262335",
          "editor.foreground": "#ffffff",
          "accent": "#fe4450", // inline comment
          "sideBar.background": "#241b2f",
        },
      }
    `;

    const cleaned = stripJsonComments(rawJsonc);
    expect(cleaned).not.toContain("//");
    expect(cleaned).not.toContain("/*");

    const imported = importCustomThemeFromJson(rawJsonc);
    expect(imported.label).toBe("Synthwave Glow");
    expect(imported.id).toBe("synthwave-glow");
    expect(imported.uiTheme).toBe("vs-dark");
    expect(imported.colors["editor.background"]).toBe("#262335");
    expect(imported.colors.accent).toBe("#fe4450");
  });

  it("preserves 8-character hex colors with alpha channels on import", () => {
    const jsonWithAlpha = JSON.stringify({
      id: "alpha-neon",
      label: "Alpha Neon",
      colors: {
        "editor.background": "#1e1e2ecc",
        "editor.selectionBackground": "#45475a80",
        accent: "#f38ba8ff",
      },
    });

    const imported = importCustomThemeFromJson(jsonWithAlpha);
    expect(imported.colors["editor.background"]).toBe("#1e1e2ecc");
    expect(imported.colors["editor.selectionBackground"]).toBe("#45475a80");
    expect(imported.colors.accent).toBe("#f38ba8ff");
  });

  it("exports themes consumable by extension collectContributions", () => {
    const themeDef: CustomThemeDefinition = {
      id: "amber-glow",
      label: "Amber Glow",
      uiTheme: "vs-dark",
      colors: {
        ...THEME_PRESETS.dark.colors,
        "editor.background": "#1a120b",
        "editor.foreground": "#e5b869",
        accent: "#d48128",
      },
    };

    const exportedJson = exportCustomThemeJson(themeDef);
    const parsed = JSON.parse(exportedJson);
    expect(parsed.mode).toBe("dark");
    expect(parsed.colors.bg).toBe("#1a120b");
    expect(parsed.colors.fg).toBe("#e5b869");

    const mockManifest = {
      id: "test.theme-ext",
      name: "Theme Extension",
      version: "1.0.0",
      description: "Test theme extension",
      enabled: true,
      path: "/mock/ext",
      contributes: {
        themes: [parsed],
      },
    };

    const contributions = collectContributions([mockManifest as any]);
    expect(contributions.themes.length).toBe(1);
    expect(contributions.themes[0].id).toBe("amber-glow");
    expect(contributions.themes[0].colors.bg).toBe("#1a120b");
    expect(contributions.themes[0].colors.fg).toBe("#e5b869");
    expect(contributions.themes[0].colors.accent).toBe("#d48128");
  });

  it("throws clear error on malformed JSON or empty string", () => {
    expect(() => importCustomThemeFromJson("")).toThrow("must be a non-empty string");
    expect(() => importCustomThemeFromJson("{ bad json }")).toThrow("Failed to parse theme JSON");
    expect(() => importCustomThemeFromJson(JSON.stringify({ notATheme: 123 }))).toThrow("missing a valid 'colors' object");
  });
});

describe("Monaco and Dynamic CSS Variables Integration", () => {
  it("resolves Monaco theme IDs for custom themes correctly", () => {
    const customList: CustomThemeDefinition[] = [
      {
        id: "emerald",
        label: "Emerald",
        uiTheme: "vs-dark",
        colors: { ...THEME_PRESETS.dark.colors },
      },
    ];

    expect(monacoThemeId("custom:emerald", [], customList)).toBe("t3d-custom-emerald");
    expect(monacoThemeId("emerald", [], customList)).toBe("t3d-custom-emerald");
    expect(monacoThemeId("dark", [], customList)).toBe("t3d-dark");
  });

  it("defines Monaco custom themes with editor defineTheme", () => {
    const definedThemes: Record<string, any> = {};
    const mockMonaco = {
      editor: {
        defineTheme: (name: string, data: any) => {
          definedThemes[name] = data;
        },
      },
    } as any;

    const customTheme: CustomThemeDefinition = {
      id: "amethyst",
      label: "Amethyst",
      uiTheme: "vs-dark",
      colors: {
        ...THEME_PRESETS.dark.colors,
        "editor.background": "#120824",
        "editor.foreground": "#d8c4f0",
        accent: "#9d4edd",
      },
    };

    defineCustomThemes(mockMonaco, [customTheme]);
    expect(definedThemes["t3d-custom-amethyst"]).toBeDefined();
    expect(definedThemes["t3d-custom-amethyst"].base).toBe("vs-dark");
    expect(definedThemes["t3d-custom-amethyst"].colors["editor.background"]).toBe("#120824");
    expect(definedThemes["t3d-custom-amethyst"].colors["editor.foreground"]).toBe("#d8c4f0");
  });

  it("injects and cleans up custom CSS variables style tag safely", () => {
    // In node/bun environment without real DOM, applyCustomThemeCss gracefully checks document
    expect(() => applyCustomThemeCss(null)).not.toThrow();

    // Mock document to verify CSS output rules
    const styleTags: Record<string, any> = {};
    const mockDoc = {
      getElementById: (id: string) => styleTags[id] ?? null,
      createElement: (_tag: string) => ({ id: "", textContent: "", remove: () => {} }),
      head: {
        appendChild: (el: any) => {
          styleTags[el.id] = el;
        },
      },
    };
    (globalThis as any).document = mockDoc;

    const themeWithMissingSlots: CustomThemeDefinition = {
      id: "partial-theme",
      label: "Partial Theme",
      uiTheme: "vs-dark",
      colors: {
        "editor.background": "#101010",
        // all other slots missing
      } as any,
    };

    expect(() => applyCustomThemeCss(themeWithMissingSlots)).not.toThrow();
    const injected = styleTags["t3d-custom-theme-vars"];
    expect(injected).toBeDefined();
    expect(injected.textContent).toContain(":root, :root[data-theme], [data-theme]");
    expect(injected.textContent).toContain("--bg-island: #101010;");
    // Fallbacks applied for missing slots
    expect(injected.textContent).not.toContain("undefined");
    expect(injected.textContent).toContain("--scrollbar-thumb:");

    // Clean up mock document
    delete (globalThis as any).document;
  });
});

describe("ThemeEditor UI Component", () => {
  it("renders the Theme Editor component with all sections and controls", () => {
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeEditor, { onClose: () => {} })
      )
    );

    expect(html).toContain("Visual Theme Editor");
    expect(html).toContain("Target Theme:");
    expect(html).toContain("Clone Preset:");
    expect(html).toContain("Save Theme");
    expect(html).toContain("Reset");
    expect(html).toContain("Export JSON");
    expect(html).toContain("Import JSON");
    expect(html).toContain("Live in App");
  });

  it("renders all 12 color slot inputs for editor and chrome", () => {
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeEditor)
      )
    );

    for (const slot of THEME_COLOR_SLOTS) {
      expect(html).toContain(slot.label);
      expect(html).toContain(slot.key);
    }
  });

  it("renders the miniature interactive live preview frame with activity bar, sidebar, and status bar", () => {
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeEditor)
      )
    );

    expect(html).toContain("Interactive Live Preview");
    expect(html).toContain("Real-time Miniature");
    expect(html).toContain("theme-preview-frame");
    expect(html).toContain("theme-preview-activitybar");
    expect(html).toContain("theme-preview-sidebar");
    expect(html).toContain("theme-preview-editor");
    expect(html).toContain("theme-preview-statusbar");
    expect(html).toContain("EXPLORER");
    expect(html).toContain("App.tsx");
    expect(html).toContain("Counter");
    expect(html).toContain("⎇ main");
  });
});

describe("Command Palette Integration", () => {
  it("registers workbench.action.openThemeEditor in COMMANDS registry", () => {
    const cmd = COMMANDS.find((c) => c.id === "workbench.action.openThemeEditor");
    expect(cmd).toBeDefined();
    expect(cmd?.title).toBe("Preferences: Open Theme Editor");
    expect(cmd?.category).toBe("Preferences");

    let called = false;
    const mockCtx = {
      openThemeEditor: () => {
        called = true;
      },
    } as any;

    cmd?.run(mockCtx);
    expect(called).toBe(true);
  });
});
