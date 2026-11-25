import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AppShell.css";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import {
  EditorActionsProvider,
  useEditorActions,
} from "../editor/EditorActions";
import { DiagnosticsProvider } from "../lsp/DiagnosticsContext";
import { AiProvider } from "../ai/AiContext";
import { AiPanel } from "../ai/AiPanel";
import { ExtensionsProvider, useExtensions } from "../extensions/ExtensionsContext";
import { DebugProvider } from "../debug/DebugContext";
import { SettingsProvider } from "../settings/SettingsContext";
import { SettingsPanel } from "../settings/SettingsPanel";
import { NotificationsProvider } from "../notifications/NotificationsContext";
import { CommandPalette } from "../commands/CommandPalette";
import type { Command, CommandContext } from "../commands/types";
import type { GitSummary } from "../scm/ScmPanel";
import { TitleBar } from "./TitleBar";
import { Sidebar, type SidebarMode } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { StatusBar } from "./StatusBar";
import { BottomPanel, type BottomTab } from "./BottomPanel";
import { LayoutProvider, useLayout } from "./LayoutContext";
import { ResizeHandle } from "./ResizeHandle";

function ShellChrome() {
  const { save, closeTab, activePath, openFolder, rootPath } = useWorkspace();
  const { toggleTheme } = useTheme();
  const { findInFile } = useEditorActions();
  const { extensions } = useExtensions();
  const {
    sidebarWidth,
    aiWidth,
    bottomHeight,
    sidebarOpen,
    aiOpen,
    bottomOpen,
    setSidebarWidth,
    setAiWidth,
    setBottomHeight,
    toggleSidebar,
    toggleAi,
    setBottomOpen,
    setAiOpen,
  } = useLayout();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("explorer");
  const [panelTab, setPanelTab] = useState<BottomTab>("terminal");
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState("");
  const [hideDotfiles, setHideDotfiles] = useState(false);

  useEffect(() => {
    if (!rootPath) {
      setGitBranch(null);
      return;
    }
    let cancelled = false;
    void invoke<GitSummary>("git_summary", { cwd: rootPath })
      .then((summary) => {
        if (!cancelled) setGitBranch(summary.branch);
      })
      .catch(() => {
        if (!cancelled) setGitBranch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSearch = useCallback(() => setSidebarMode("search"), []);
  const openExtensions = useCallback(() => setSidebarMode("extensions"), []);
  const openDebug = useCallback(() => setSidebarMode("debug"), []);

  const toggleTerminal = useCallback(() => {
    if (bottomOpen && panelTab === "terminal") {
      setBottomOpen(false);
      return;
    }
    setPanelTab("terminal");
    setBottomOpen(true);
  }, [bottomOpen, panelTab, setBottomOpen]);

  const openProblems = useCallback(() => {
    setPanelTab("problems");
    setBottomOpen(true);
  }, [setBottomOpen]);

  const extensionCommands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    for (const ext of extensions) {
      if (!ext.enabled) continue;
      for (const contrib of ext.contributes?.commands ?? []) {
        cmds.push({
          id: contrib.id,
          title: contrib.title,
          category: "Extension",
          run: () => {
            window.alert(`${contrib.title}\n\n(from ${ext.name})`);
          },
        });
      }
    }
    return cmds;
  }, [extensions]);

  const commandContext = useMemo<CommandContext>(
    () => ({
      openFolder,
      save,
      closeActive: () => {
        if (activePath) closeTab(activePath);
      },
      toggleTheme,
      openPalette,
      closePalette,
      findInFile,
      openSearch,
      toggleTerminal,
      openProblems,
      toggleAi,
      openExtensions,
      openDebug,
      openSettings,
      toggleSidebar,
    }),
    [
      openFolder,
      save,
      activePath,
      closeTab,
      toggleTheme,
      openPalette,
      closePalette,
      findInFile,
      openSearch,
      toggleTerminal,
      openProblems,
      toggleAi,
      openExtensions,
      openDebug,
      openSettings,
      toggleSidebar,
    ],
  );

  useEffect(() => {
    let chord: string | null = null;
    let chordTimer: number | undefined;

    const clearChord = () => {
      chord = null;
      if (chordTimer !== undefined) window.clearTimeout(chordTimer);
      chordTimer = undefined;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        if (settingsOpen) {
          event.preventDefault();
          closeSettings();
          return;
        }
        if (paletteOpen) {
          event.preventDefault();
          closePalette();
          return;
        }
      }

      if (mod && event.shiftKey && key === "p") {
        event.preventDefault();
        openPalette();
        clearChord();
        return;
      }

      if (mod && event.shiftKey && key === "f") {
        event.preventDefault();
        openSearch();
        clearChord();
        return;
      }

      if (mod && event.shiftKey && key === "a") {
        event.preventDefault();
        toggleAi();
        clearChord();
        return;
      }

      if (mod && event.shiftKey && key === "m") {
        event.preventDefault();
        openProblems();
        clearChord();
        return;
      }

      if (mod && key === ",") {
        event.preventDefault();
        openSettings();
        clearChord();
        return;
      }

      if (mod && key === "b") {
        event.preventDefault();
        toggleSidebar();
        clearChord();
        return;
      }

      if (mod && (key === "`" || event.code === "Backquote")) {
        event.preventDefault();
        toggleTerminal();
        clearChord();
        return;
      }

      if (mod && key === "f" && !event.shiftKey) {
        event.preventDefault();
        findInFile();
        clearChord();
        return;
      }

      if (mod && key === "s") {
        event.preventDefault();
        void save();
        clearChord();
        return;
      }

      if (mod && key === "w" && activePath) {
        event.preventDefault();
        closeTab(activePath);
        clearChord();
        return;
      }

      if (mod && key === "k") {
        event.preventDefault();
        chord = "ctrl+k";
        if (chordTimer !== undefined) window.clearTimeout(chordTimer);
        chordTimer = window.setTimeout(clearChord, 1500);
        return;
      }

      if (chord === "ctrl+k") {
        if (key === "o") {
          event.preventDefault();
          void openFolder();
          clearChord();
          return;
        }
        if (key === "t") {
          event.preventDefault();
          toggleTheme();
          clearChord();
          return;
        }
        clearChord();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [
    paletteOpen,
    settingsOpen,
    closePalette,
    closeSettings,
    openPalette,
    openSettings,
    openSearch,
    findInFile,
    save,
    activePath,
    closeTab,
    openFolder,
    toggleTheme,
    toggleTerminal,
    toggleAi,
    openProblems,
    toggleSidebar,
  ]);

  const workspaceStyle = {
    gridTemplateColumns: [
      sidebarOpen ? `${sidebarWidth}px` : "0px",
      sidebarOpen ? "6px" : "0px",
      "minmax(0, 1fr)",
      aiOpen ? "6px" : "0px",
      aiOpen ? `${aiWidth}px` : "0px",
    ].join(" "),
  } as const;

  return (
    <div className="app-shell">
      <TitleBar onOpenPalette={openPalette} onOpenSettings={openSettings} />
      <div className="app-shell__workspace" style={workspaceStyle}>
        <div
          className="app-shell__sidebar-slot"
          style={{ display: sidebarOpen ? "flex" : "none" }}
        >
          <Sidebar
            mode={sidebarMode}
            onModeChange={setSidebarMode}
            onBranch={setGitBranch}
            gitBranch={gitBranch}
            onToggleTerminal={toggleTerminal}
            onOpenProblems={openProblems}
            treeFilter={treeFilter}
            onTreeFilter={setTreeFilter}
            hideDotfiles={hideDotfiles}
            onToggleHideDotfiles={() => setHideDotfiles((v) => !v)}
          />
        </div>
        {sidebarOpen ? (
          <ResizeHandle
            axis="x"
            label="Resize sidebar"
            onResize={(d) => setSidebarWidth(sidebarWidth + d)}
            onDoubleClick={toggleSidebar}
          />
        ) : (
          <div />
        )}

        <div className="app-shell__main">
          <EditorArea />
          {bottomOpen ? (
            <ResizeHandle
              axis="y"
              invert
              label="Resize panel"
              onResize={(d) => setBottomHeight(bottomHeight + d)}
              onDoubleClick={() => setBottomOpen(false)}
            />
          ) : null}
          <BottomPanel
            open={bottomOpen}
            tab={panelTab}
            onTabChange={setPanelTab}
            height={bottomHeight}
          />
        </div>

        {aiOpen ? (
          <ResizeHandle
            axis="x"
            invert
            label="Resize AI panel"
            onResize={(d) => setAiWidth(aiWidth + d)}
            onDoubleClick={() => setAiOpen(false)}
          />
        ) : (
          <div />
        )}
        <div
          className="app-shell__ai-slot"
          style={{ display: aiOpen ? "flex" : "none" }}
        >
          <AiPanel onOpenSettings={openSettings} />
        </div>
      </div>
      <StatusBar
        onOpenProblems={openProblems}
        onOpenSettings={openSettings}
        gitBranch={gitBranch}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        context={commandContext}
        extraCommands={extensionCommands}
      />
      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
    </div>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <EditorActionsProvider>
        <DiagnosticsProvider>
          <AiProvider>
            <ExtensionsProvider>
              <DebugProvider>
                <SettingsProvider>
                  <NotificationsProvider>
                    <LayoutProvider>
                      <ShellChrome />
                    </LayoutProvider>
                  </NotificationsProvider>
                </SettingsProvider>
              </DebugProvider>
            </ExtensionsProvider>
          </AiProvider>
        </DiagnosticsProvider>
      </EditorActionsProvider>
    </WorkspaceProvider>
  );
}
