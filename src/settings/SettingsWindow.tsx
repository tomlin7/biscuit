import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { X } from "lucide-react";
import { WorkspaceProvider } from "../workspace/WorkspaceContext";
import { NotificationsProvider } from "../notifications/NotificationsContext";
import { AiProvider } from "../ai/AiContext";
import { SettingsProvider } from "./SettingsContext";
import { IconThemeProvider } from "../theme/iconTheme/IconThemeContext";
import { SettingsPanel, type SettingsCategory } from "./SettingsPanel";
import { applyChromeAcrylic } from "../layout/chromeAcrylic";
import { SETTINGS_TAB_EVENT, type SettingsTab } from "./openSettingsWindow";
import { IconButton } from "../ui/IconButton";
import "./SettingsWindow.css";

function readInitialTab(): SettingsCategory {
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "appearance" || tab === "editor" || tab === "ai") return tab;
  return "editor";
}

function SettingsWindowChrome() {
  const [tab, setTab] = useState<SettingsCategory>(() => readInitialTab());

  useEffect(() => {
    document.documentElement.setAttribute("data-settings-window", "");
    document.documentElement.setAttribute("data-chrome-acrylic", "");
    void applyChromeAcrylic(true);
    return () => {
      document.documentElement.removeAttribute("data-settings-window");
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<SettingsTab>(SETTINGS_TAB_EVENT, (event) => {
      const next = event.payload;
      if (next === "appearance" || next === "editor" || next === "ai") {
        setTab(next);
      }
    }).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void getCurrentWindow().close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    void getCurrentWindow().close();
  };

  return (
    <div className="settings-window">
      <header className="settings-window__titlebar" data-tauri-drag-region="deep">
        <span className="settings-window__title">Settings</span>
        <IconButton
          icon={X}
          label="Close"
          onClick={close}
          {...({ "data-tauri-drag-region": "false" } as const)}
        />
      </header>
      <div className="settings-window__body">
        <SettingsPanel
          open
          variant="window"
          onClose={close}
          initialTab={tab}
        />
      </div>
    </div>
  );
}

/** Dedicated acrylic settings window entry (no editor chrome). */
export function SettingsWindowApp() {
  return (
    <WorkspaceProvider>
      <NotificationsProvider>
        <AiProvider>
          <SettingsProvider>
            <IconThemeProvider>
              <SettingsWindowChrome />
            </IconThemeProvider>
          </SettingsProvider>
        </AiProvider>
      </NotificationsProvider>
    </WorkspaceProvider>
  );
}
