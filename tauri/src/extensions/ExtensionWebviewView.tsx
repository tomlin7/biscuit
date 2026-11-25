import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useExtensions } from "./ExtensionsContext";
import { extensionHost } from "./host/extensionHost";
import { parseWebviewPath } from "../workspace/path";
import "./ExtensionWebviewView.css";

type Props = {
  path: string;
};

export function ExtensionWebviewView({ path }: Props) {
  const { extensions } = useExtensions();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const parsed = parseWebviewPath(path);
  const [browserHtml, setBrowserHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const extension = parsed ? extensions.find((e) => e.id === parsed.extensionId) : null;
  const webview = parsed && extension
    ? extension.contributes?.webviews?.find((w) => w.id === parsed.viewId)
    : null;

  // Fire onView activation events
  useEffect(() => {
    if (!parsed) return;
    extensionHost.fireEvent(`onView:${parsed.viewId}`);
    extensionHost.fireEvent(`onView:${parsed.extensionId}/${parsed.viewId}`);
  }, [parsed?.extensionId, parsed?.viewId]);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  // In non-Tauri browser preview, read content via Tauri command or show fallback
  useEffect(() => {
    if (isTauri || !parsed || !webview) return;
    let cancelled = false;
    invoke<string>("read_extension_file", { id: parsed.extensionId, path: webview.entry })
      .then((content) => {
        if (!cancelled) setBrowserHtml(content);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isTauri, parsed?.extensionId, webview?.entry]);

  // Send theme tokens to the webview
  const postTheme = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    const styles = getComputedStyle(document.documentElement);
    const themeColors: Record<string, string> = {
      bgRoot: styles.getPropertyValue("--bg-root").trim(),
      bgIsland: styles.getPropertyValue("--bg-island").trim(),
      bgIslandElevated: styles.getPropertyValue("--bg-island-elevated").trim(),
      bgHover: styles.getPropertyValue("--bg-hover").trim(),
      bgActive: styles.getPropertyValue("--bg-active").trim(),
      fg: styles.getPropertyValue("--fg").trim(),
      fgMuted: styles.getPropertyValue("--fg-muted").trim(),
      fgDim: styles.getPropertyValue("--fg-dim").trim(),
      border: styles.getPropertyValue("--border").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
      fontUi: styles.getPropertyValue("--font-ui").trim(),
      fontMono: styles.getPropertyValue("--font-mono").trim(),
    };
    frame.contentWindow.postMessage(
      {
        type: "t3d:theme",
        theme: document.documentElement.getAttribute("data-theme") || "dark",
        colors: themeColors,
      },
      "*",
    );
  };

  // Sync theme when data-theme changes on html
  useEffect(() => {
    const observer = new MutationObserver(postTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // PostMessage bridge from webview to editor
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "t3d:ready") {
        postTheme();
      } else if (data.type === "t3d:command" && typeof data.command === "string") {
        const args = Array.isArray(data.args) ? data.args : [];
        void extensionHost.executeCommand(data.command, args);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!parsed) {
    return <div className="extension-webview__error">Invalid webview path: {path}</div>;
  }

  if (!extension) {
    return (
      <div className="extension-webview__error">
        <span>Extension <code>{parsed.extensionId}</code> is not installed or enabled.</span>
      </div>
    );
  }

  if (!webview) {
    return (
      <div className="extension-webview__error">
        <span>Webview <code>{parsed.viewId}</code> not found in extension <code>{parsed.extensionId}</code>.</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="extension-webview__error">
        <span>Failed to load webview: {loadError}</span>
      </div>
    );
  }

  const frameSrc = isTauri
    ? `t3dext://${parsed.extensionId}/${webview.entry.replace(/^\/+/, "")}`
    : undefined;

  return (
    <div className="extension-webview">
      <iframe
        ref={iframeRef}
        className="extension-webview__frame"
        src={frameSrc}
        srcDoc={!isTauri && browserHtml ? browserHtml : undefined}
        sandbox="allow-scripts"
        title={webview.title || webview.id}
        onLoad={postTheme}
      />
    </div>
  );
}
