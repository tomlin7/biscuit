// Listen for theme tokens from T3D editor
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "t3d:theme" && data.colors) {
    const root = document.documentElement;
    if (data.theme) root.setAttribute("data-theme", data.theme);
    const c = data.colors;
    if (c.bgRoot) root.style.setProperty("--bg-root", c.bgRoot);
    if (c.bgIsland) root.style.setProperty("--bg-island", c.bgIsland);
    if (c.bgIslandElevated) root.style.setProperty("--bg-island-elevated", c.bgIslandElevated);
    if (c.bgHover) root.style.setProperty("--bg-hover", c.bgHover);
    if (c.bgActive) root.style.setProperty("--bg-active", c.bgActive);
    if (c.fg) root.style.setProperty("--fg", c.fg);
    if (c.fgMuted) root.style.setProperty("--fg-muted", c.fgMuted);
    if (c.fgDim) root.style.setProperty("--fg-dim", c.fgDim);
    if (c.border) root.style.setProperty("--border", c.border);
    if (c.accent) root.style.setProperty("--accent", c.accent);
    if (c.fontUi) root.style.setProperty("--font-ui", c.fontUi);
    if (c.fontMono) root.style.setProperty("--font-mono", c.fontMono);
  }
});

// Notify parent that webview is ready to receive theme
try {
  window.parent.postMessage({ type: "t3d:ready" }, "*");
} catch (_) {}
