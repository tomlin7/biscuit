import { describe, expect, test } from "bun:test";
import {
  BUILTIN_LAYOUT_PRESETS,
  clamp,
  createPreset,
  findPreset,
  loadPresetsFromStorage,
  MAX_AI_WIDTH,
  MAX_BOTTOM_HEIGHT,
  MAX_SIDEBAR_WIDTH,
  MIN_AI_WIDTH,
  MIN_BOTTOM_HEIGHT,
  MIN_SIDEBAR_WIDTH,
  sanitizePresetValues,
  saveCustomPresetsToStorage,
  slugify,
  type LayoutPreset,
} from "./layoutPresets";

describe("layoutPresets", () => {
  test("defines all standard built-in presets with valid dimensions", () => {
    const ids = BUILTIN_LAYOUT_PRESETS.map((p) => p.id);
    expect(ids).toContain("coding");
    expect(ids).toContain("debugging");
    expect(ids).toContain("writing");
    expect(ids).toContain("ai-assistant");
    expect(ids).toContain("terminal-focus");

    for (const preset of BUILTIN_LAYOUT_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.isBuiltin).toBe(true);
      expect(preset.values.sidebarWidth).toBeGreaterThanOrEqual(MIN_SIDEBAR_WIDTH);
      expect(preset.values.sidebarWidth).toBeLessThanOrEqual(MAX_SIDEBAR_WIDTH);
      expect(preset.values.aiWidth).toBeGreaterThanOrEqual(MIN_AI_WIDTH);
      expect(preset.values.aiWidth).toBeLessThanOrEqual(MAX_AI_WIDTH);
      expect(preset.values.bottomHeight).toBeGreaterThanOrEqual(MIN_BOTTOM_HEIGHT);
      expect(preset.values.bottomHeight).toBeLessThanOrEqual(MAX_BOTTOM_HEIGHT);
    }
  });

  test("clamps numeric values to configured bounds", () => {
    expect(clamp(100, 150, 300)).toBe(150);
    expect(clamp(200, 150, 300)).toBe(200);
    expect(clamp(400, 150, 300)).toBe(300);
  });

  test("sanitizes preset values within layout constraints", () => {
    const sanitized = sanitizePresetValues({
      sidebarOpen: true,
      sidebarWidth: 9999,
      bottomOpen: false,
      bottomHeight: 10,
      aiOpen: true,
      aiWidth: 100,
    });

    expect(sanitized.sidebarOpen).toBe(true);
    expect(sanitized.sidebarWidth).toBe(MAX_SIDEBAR_WIDTH);
    expect(sanitized.bottomOpen).toBe(false);
    expect(sanitized.bottomHeight).toBe(MIN_BOTTOM_HEIGHT);
    expect(sanitized.aiOpen).toBe(true);
    expect(sanitized.aiWidth).toBe(MIN_AI_WIDTH);
  });

  test("slugifies strings for preset identifiers", () => {
    expect(slugify("Coding Mode")).toBe("coding-mode");
    expect(slugify("  My Custom Preset!  ")).toBe("my-custom-preset");
    expect(slugify("C++ & Rust Layout")).toBe("c-rust-layout");
    expect(slugify("テスト")).toBe("テスト");
    expect(slugify("Café")).toBe("café");
    expect(slugify("My Screen 💻")).toBe("my-screen");
  });

  test("generates safe non-colliding ID when custom preset uses a built-in name", () => {
    const preset = createPreset("Coding", {
      sidebarOpen: false,
      sidebarWidth: 200,
      bottomOpen: false,
      bottomHeight: 150,
      aiOpen: false,
      aiWidth: 300,
    });
    expect(preset.id).not.toBe("coding");
    expect(preset.id.startsWith("custom-coding-")).toBe(true);
    expect(preset.name).toBe("Coding");
    expect(preset.isBuiltin).toBe(false);
  });

  test("creates a custom preset with sanitized values", () => {
    const preset = createPreset("Pair Programming", {
      sidebarOpen: true,
      sidebarWidth: 320,
      bottomOpen: true,
      bottomHeight: 250,
      aiOpen: true,
      aiWidth: 400,
    });

    expect(preset.id).toBe("pair-programming");
    expect(preset.name).toBe("Pair Programming");
    expect(preset.isBuiltin).toBe(false);
    expect(preset.values.sidebarWidth).toBe(320);
    expect(preset.values.bottomHeight).toBe(250);
    expect(preset.values.aiWidth).toBe(400);
  });

  test("finds presets by ID or case-insensitive name", () => {
    expect(findPreset("coding", BUILTIN_LAYOUT_PRESETS)?.name).toBe("Coding");
    expect(findPreset("CODING", BUILTIN_LAYOUT_PRESETS)?.name).toBe("Coding");
    expect(findPreset("Debugging", BUILTIN_LAYOUT_PRESETS)?.id).toBe("debugging");
    expect(findPreset("ai-assistant", BUILTIN_LAYOUT_PRESETS)?.name).toBe("AI Assistant");
    expect(findPreset("non-existent", BUILTIN_LAYOUT_PRESETS)).toBeUndefined();
  });

  test("loads built-in presets when storage is empty or invalid", () => {
    const mockStorage: any = {
      getItem: () => null,
      setItem: () => {},
    };

    const loaded = loadPresetsFromStorage(mockStorage);
    expect(loaded.length).toBe(BUILTIN_LAYOUT_PRESETS.length);
    expect(loaded.map((p) => p.id)).toEqual(BUILTIN_LAYOUT_PRESETS.map((p) => p.id));
  });

  test("saves only custom presets to storage and merges them on load", () => {
    let savedRaw = "";
    const mockStorage: any = {
      getItem: () => savedRaw,
      setItem: (_k: string, v: string) => {
        savedRaw = v;
      },
    };

    const custom = createPreset("My Screen", {
      sidebarOpen: false,
      sidebarWidth: 200,
      bottomOpen: true,
      bottomHeight: 300,
      aiOpen: false,
      aiWidth: 300,
    });

    const allPresets: LayoutPreset[] = [...BUILTIN_LAYOUT_PRESETS, custom];
    saveCustomPresetsToStorage(mockStorage, allPresets);

    const parsedInStorage = JSON.parse(savedRaw);
    expect(parsedInStorage.length).toBe(1);
    expect(parsedInStorage[0].id).toBe("my-screen");

    const reloaded = loadPresetsFromStorage(mockStorage);
    expect(reloaded.length).toBe(BUILTIN_LAYOUT_PRESETS.length + 1);
    expect(reloaded.find((p) => p.id === "my-screen")).toBeDefined();
  });

  test("registers layout preset commands in COMMANDS palette registry", async () => {
    const { COMMANDS } = await import("../commands/registry");

    const applyCmd = COMMANDS.find((c) => c.id === "workbench.action.applyLayoutPreset");
    expect(applyCmd).toBeDefined();

    const codingCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.coding");
    expect(codingCmd).toBeDefined();

    const debugCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.debugging");
    expect(debugCmd).toBeDefined();

    const writeCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.writing");
    expect(writeCmd).toBeDefined();

    const aiCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.aiAssistant");
    expect(aiCmd).toBeDefined();

    const termCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.terminalFocus");
    expect(termCmd).toBeDefined();

    const saveCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.saveCurrent");
    expect(saveCmd).toBeDefined();

    const delCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.delete");
    expect(delCmd).toBeDefined();

    const resetCmd = COMMANDS.find((c) => c.id === "workbench.action.layoutPresets.resetDefaults");
    expect(resetCmd).toBeDefined();

    // Verify executions invoke corresponding context handlers
    let invokedPreset = "";
    let saveInvoked = false;
    let delInvoked = false;
    let resetInvoked = false;

    const mockCtx: any = {
      applyLayoutPreset: (preset?: string) => {
        invokedPreset = preset || "picker";
      },
      saveCurrentLayoutPreset: () => {
        saveInvoked = true;
      },
      deleteLayoutPreset: () => {
        delInvoked = true;
      },
      resetLayoutPresets: () => {
        resetInvoked = true;
      },
    };

    applyCmd?.run(mockCtx);
    expect(invokedPreset).toBe("picker");

    codingCmd?.run(mockCtx);
    expect(invokedPreset).toBe("coding");

    debugCmd?.run(mockCtx);
    expect(invokedPreset).toBe("debugging");

    writeCmd?.run(mockCtx);
    expect(invokedPreset).toBe("writing");

    aiCmd?.run(mockCtx);
    expect(invokedPreset).toBe("ai-assistant");

    termCmd?.run(mockCtx);
    expect(invokedPreset).toBe("terminal-focus");

    saveCmd?.run(mockCtx);
    expect(saveInvoked).toBe(true);

    delCmd?.run(mockCtx);
    expect(delInvoked).toBe(true);

    resetCmd?.run(mockCtx);
    expect(resetInvoked).toBe(true);
  });
});

