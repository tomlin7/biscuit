import { Effect, getCurrentWindow } from "@tauri-apps/api/window";

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Mark the DOM so CSS can reveal acrylic in chrome gutters only. */
function setAcrylicAttr(on: boolean) {
  if (on) {
    document.documentElement.setAttribute("data-chrome-acrylic", "");
  } else {
    document.documentElement.removeAttribute("data-chrome-acrylic");
  }
}

/**
 * Apply or clear Win11 Acrylic on the window backdrop.
 * Islands stay opaque via CSS; only the shell crease shows the effect.
 */
export async function applyChromeAcrylic(enabled: boolean): Promise<void> {
  if (!inTauri()) {
    setAcrylicAttr(false);
    return;
  }
  const win = getCurrentWindow();
  try {
    if (enabled) {
      await win.setEffects({ effects: [Effect.Acrylic] });
      setAcrylicAttr(true);
    } else {
      await win.clearEffects();
      setAcrylicAttr(false);
    }
  } catch {
    /* Platform may not support acrylic (or permissions missing). */
    setAcrylicAttr(false);
  }
}
