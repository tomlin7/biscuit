export type LayoutPresetValues = {
  sidebarOpen: boolean;
  sidebarWidth: number;
  bottomOpen: boolean;
  bottomHeight: number;
  aiOpen: boolean;
  aiWidth: number;
};

export type LayoutPreset = {
  id: string;
  name: string;
  isBuiltin?: boolean;
  values: LayoutPresetValues;
};

export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 520;
export const MIN_AI_WIDTH = 260;
export const MAX_AI_WIDTH = 560;
export const MIN_BOTTOM_HEIGHT = 120;
export const MAX_BOTTOM_HEIGHT = 480;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function sanitizePresetValues(values: Partial<LayoutPresetValues>): LayoutPresetValues {
  return {
    sidebarOpen: Boolean(values.sidebarOpen),
    sidebarWidth: clamp(values.sidebarWidth ?? 280, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
    bottomOpen: Boolean(values.bottomOpen),
    bottomHeight: clamp(values.bottomHeight ?? 220, MIN_BOTTOM_HEIGHT, MAX_BOTTOM_HEIGHT),
    aiOpen: Boolean(values.aiOpen),
    aiWidth: clamp(values.aiWidth ?? 340, MIN_AI_WIDTH, MAX_AI_WIDTH),
  };
}

export const BUILTIN_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "coding",
    name: "Coding",
    isBuiltin: true,
    values: {
      sidebarOpen: true,
      sidebarWidth: 280,
      bottomOpen: false,
      bottomHeight: 220,
      aiOpen: false,
      aiWidth: 340,
    },
  },
  {
    id: "debugging",
    name: "Debugging",
    isBuiltin: true,
    values: {
      sidebarOpen: true,
      sidebarWidth: 260,
      bottomOpen: true,
      bottomHeight: 260,
      aiOpen: false,
      aiWidth: 340,
    },
  },
  {
    id: "writing",
    name: "Writing",
    isBuiltin: true,
    values: {
      sidebarOpen: false,
      sidebarWidth: 280,
      bottomOpen: false,
      bottomHeight: 220,
      aiOpen: false,
      aiWidth: 340,
    },
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    isBuiltin: true,
    values: {
      sidebarOpen: true,
      sidebarWidth: 260,
      bottomOpen: false,
      bottomHeight: 220,
      aiOpen: true,
      aiWidth: 380,
    },
  },
  {
    id: "terminal-focus",
    name: "Terminal Focus",
    isBuiltin: true,
    values: {
      sidebarOpen: false,
      sidebarWidth: 280,
      bottomOpen: true,
      bottomHeight: 360,
      aiOpen: false,
      aiWidth: 340,
    },
  },
];

export const LAYOUT_PRESETS_STORAGE_KEY = "t3d.layout.presets.v1";

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function createPreset(name: string, values: LayoutPresetValues): LayoutPreset {
  const trimmed = name.trim();
  const slug = slugify(trimmed);
  const isBuiltin = BUILTIN_LAYOUT_PRESETS.some(
    (b) => b.id.toLowerCase() === slug.toLowerCase() || b.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const id = isBuiltin
    ? `custom-${slug || "preset"}-${Date.now().toString(36)}`
    : slug || `preset-${Date.now().toString(36)}`;
  return {
    id,
    name: trimmed,
    isBuiltin: false,
    values: sanitizePresetValues(values),
  };
}

export function findPreset(
  query: string,
  presets: LayoutPreset[],
): LayoutPreset | undefined {
  const q = query.trim().toLowerCase();
  return presets.find(
    (p) => p.id.toLowerCase() === q || p.name.toLowerCase() === q,
  );
}

export function loadPresetsFromStorage(storage?: Storage): LayoutPreset[] {
  if (!storage) return [...BUILTIN_LAYOUT_PRESETS];
  try {
    const raw = storage.getItem(LAYOUT_PRESETS_STORAGE_KEY);
    if (!raw) return [...BUILTIN_LAYOUT_PRESETS];
    const userCustom: LayoutPreset[] = JSON.parse(raw);
    if (!Array.isArray(userCustom)) return [...BUILTIN_LAYOUT_PRESETS];

    const sanitizedCustom = userCustom
      .filter((p) => p && typeof p.name === "string" && p.values)
      .map((p) => ({
        id: p.id || slugify(p.name),
        name: p.name.trim(),
        isBuiltin: false,
        values: sanitizePresetValues(p.values),
      }));

    // Builtins take precedence for IDs, followed by user custom presets
    const builtinIds = new Set(BUILTIN_LAYOUT_PRESETS.map((b) => b.id));
    const dedupedCustom = sanitizedCustom.filter((c) => !builtinIds.has(c.id));

    return [...BUILTIN_LAYOUT_PRESETS, ...dedupedCustom];
  } catch {
    return [...BUILTIN_LAYOUT_PRESETS];
  }
}

export function saveCustomPresetsToStorage(
  storage: Storage | undefined,
  presets: LayoutPreset[],
): void {
  if (!storage) return;
  try {
    const userOnly = presets.filter((p) => !p.isBuiltin);
    storage.setItem(LAYOUT_PRESETS_STORAGE_KEY, JSON.stringify(userOnly));
  } catch {
    /* ignore storage quota or access errors */
  }
}
