import { Effect } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const SETTINGS_WINDOW_LABEL = "settings";
export const SETTINGS_TAB_EVENT = "t3d://settings-tab";

export type SettingsTab = "appearance" | "editor" | "ai";

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function settingsUrl(tab?: SettingsTab) {
  const params = new URLSearchParams({ window: "settings" });
  if (tab) params.set("tab", tab);
  return `index.html?${params.toString()}`;
}

/** Open (or focus) the dedicated Win11 acrylic settings window. */
export async function openSettingsWindow(tab: SettingsTab = "editor"): Promise<boolean> {
  if (!inTauri()) return false;

  const existing = await WebviewWindow.getByLabel(SETTINGS_WINDOW_LABEL);
  if (existing) {
    try {
      await existing.show();
      await existing.setFocus();
      await existing.emit(SETTINGS_TAB_EVENT, tab);
    } catch {
      /* ignore focus failures */
    }
    return true;
  }

  const created = new WebviewWindow(SETTINGS_WINDOW_LABEL, {
    url: settingsUrl(tab),
    title: "Settings — T3D",
    width: 780,
    height: 680,
    minWidth: 560,
    minHeight: 420,
    center: true,
    focus: true,
    decorations: false,
    transparent: true,
    shadow: true,
    resizable: true,
    visible: true,
    windowEffects: { effects: [Effect.Acrylic] },
  });

  await new Promise<void>((resolve, reject) => {
    void created.once("tauri://created", () => resolve());
    void created.once("tauri://error", (event) => {
      reject(new Error(String(event.payload ?? "Failed to open settings")));
    });
  });

  try {
    await created.setEffects({ effects: [Effect.Acrylic] });
  } catch {
    /* acrylic may already be applied via windowEffects */
  }

  return true;
}
