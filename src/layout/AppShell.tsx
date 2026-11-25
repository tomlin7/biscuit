import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
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
import { basename } from "../workspace/path";
import { recentFiles, recentFolders } from "../workspace/history";
import { symbolsForFile } from "../lsp/OutlinePanel";
import { TitleBar } from "./TitleBar";
import { Sidebar, type SidebarMode } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { StatusBar } from "./StatusBar";
import { BottomPanel, type BottomTab } from "./BottomPanel";
import { LayoutProvider, useLayout } from "./LayoutContext";
import { ResizeHandle } from "./ResizeHandle";

function ShellChrome() {
  const {
    save,
    saveAs,
    saveAll,
    closeTab,
    closeAll,
    activePath,
    openFolder,
    openFolderAt,
    openFile,
    openFileAt,
    reopenClosed,
    document,
    rootPath,
  } = useWorkspace();
  const { toggleTheme } = useTheme();
  const { findInFile, runEditorCommand } = useEditorActions();
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
    setSidebarOpen,
  } = useLayout();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSeed, setPaletteSeed] = useState("");
  const [recentCommands, setRecentCommands] = useState<Command[]>([]);
  const [symbolCommands, setSymbolCommands] = useState<Command[]>([]);
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

  const openPalette = useCallback(() => {
    const files = recentFiles().slice(0, 8).map((path) => ({
      id: `recent.file:${path}`,
      title: `Open Recent — ${basename(path)}`,
      category: "File",
      run: () => void openFile(path),
    }));
    const folders = recentFolders().slice(0, 8).map((path) => ({
      id: `recent.folder:${path}`,
      title: `Open Recent Folder — ${basename(path)}`,
      category: "File",
      run: () => void openFolderAt(path),
    }));
    setRecentCommands([...files, ...folders]);
    setPaletteSeed("");
    setPaletteOpen(true);
  }, [openFile, openFolderAt]);

  const openSymbols = useCallback(() => {
    const current = document;
    if (!current) {
      setSymbolCommands([]);
      setPaletteSeed("Go to Symbol");
      setPaletteOpen(true);
      return;
    }
    void symbolsForFile(current.path, current.value, current.language).then((symbols) => {
      setSymbolCommands(
        symbols.slice(0, 80).map((symbol) => ({
          id: `symbol:${current.path}:${symbol.line}:${symbol.name}`,
          title: `Go to Symbol — ${symbol.name}`,
          category: symbol.kind,
          run: () => void openFileAt(current.path, symbol.line, 1),
        })),
      );
    });
    setPaletteSeed("Go to Symbol");
    setPaletteOpen(true);
  }, [document, openFileAt]);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const cloneRepository = useCallback(async () => {
    const url = window.prompt("Repository URL");
    if (!url?.trim()) return;
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Clone into folder",
    });
    if (selected === null) return;
    const parent = Array.isArray(selected) ? selected[0] : selected;
    if (!parent) return;
    const dest = await invoke<string>("git_clone", { url: url.trim(), parent });
    await openFolderAt(dest);
  }, [openFolderAt]);

  const openSearch = useCallback(() => {
    setSidebarMode("search");
    setSidebarOpen(true);
  }, [setSidebarOpen]);
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
      cloneRepository,
      openFolderAt,
      openFile,
      reopenClosed,
      save,
      saveAs,
      saveAll,
      closeActive: () => {
        if (activePath) closeTab(activePath);
      },
      closeAll,
      toggleTheme,
      openPalette,
      openSymbols,
      closePalette,
      findInFile,
      runEditorCommand,
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
      cloneRepository,
      openFolderAt,
      openFile,
      reopenClosed,
      save,
      saveAs,
      saveAll,
      closeAll,
      activePath,
      closeTab,
      toggleTheme,
      openPalette,
      openSymbols,
      closePalette,
      findInFile,
      runEditorCommand,
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

      if (event.key === "F2") {
        event.preventDefault();
        runEditorCommand("rename");
        clearChord();
        return;
      }

      if (event.key === "F12") {
        event.preventDefault();
        runEditorCommand(event.shiftKey ? "references" : "definition");
        clearChord();
        return;
      }

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

      if (mod && event.shiftKey && key === "t") {
        event.preventDefault();
        void reopenClosed();
        clearChord();
        return;
      }

      if (mod && event.shiftKey && key === "o") {
        event.preventDefault();
        openSymbols();
        clearChord();
        return;
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

      if (mod && event.shiftKey && key === "s" && !chord) {
        event.preventDefault();
        void saveAs();
        clearChord();
        return;
      }

      if (chord === "ctrl+k" && key === "s") {
        event.preventDefault();
        void saveAll();
        clearChord();
        return;
      }

      if (chord === "ctrl+k" && key === "w") {
        event.preventDefault();
        closeAll();
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
    openSymbols,
    reopenClosed,
    openSettings,
    openSearch,
    findInFile,
    runEditorCommand,
    save,
    saveAs,
    saveAll,
    closeAll,
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
      sidebarOpen ? `${sidebarWidth}px` : "0fr",
      sidebarOpen ? "var(--gap-shell)" : "0px",
      "minmax(320px, 1fr)",
      aiOpen ? "var(--gap-shell)" : "0px",
      aiOpen ? `${aiWidth}px` : "0fr",
    ].join(" "),
  } as const;

  return (
    <div className="app-shell">
      <TitleBar
        sidebarMode={sidebarMode}
        onOpenSettings={openSettings}
        onShowExplorer={() => {
          setSidebarMode("explorer");
          setSidebarOpen(true);
        }}
        onShowSearch={() => {
          setSidebarMode("search");
          setSidebarOpen(true);
        }}
        onShowOutline={() => {
          setSidebarMode("outline");
          setSidebarOpen(true);
        }}
        onShowScm={() => {
          setSidebarMode("scm");
          setSidebarOpen(true);
        }}
      />
      <div className="app-shell__workspace" style={workspaceStyle}>
        <div
          className="app-shell__sidebar-slot"
          style={{ display: sidebarOpen ? "flex" : "none" }}
        >
          <Sidebar
            mode={sidebarMode}
            onModeChange={setSidebarMode}
            onBranch={setGitBranch}
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
          <AiPanel
            onOpenSettings={openSettings}
            onOpenSearch={openSearch}
            onOpenPalette={openPalette}
          />
        </div>
      </div>
      <StatusBar
        onOpenProblems={openProblems}
        onOpenSettings={openSettings}
        onOpenScm={() => {
          setSidebarMode("scm");
          setSidebarOpen(true);
        }}
        onToggleTerminal={toggleTerminal}
        onOpenDebug={() => {
          setSidebarMode("debug");
          setSidebarOpen(true);
        }}
        gitBranch={gitBranch}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        context={commandContext}
        seed={paletteSeed}
        extraCommands={[...symbolCommands, ...recentCommands, ...extensionCommands]}
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
