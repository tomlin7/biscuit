import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AppShell.css";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import {
  EditorActionsProvider,
  useEditorActions,
} from "../editor/EditorActions";
import { CommandPalette } from "../commands/CommandPalette";
import type { CommandContext } from "../commands/types";
import { TerminalPanel } from "../terminal/TerminalPanel";
import type { GitSummary } from "../scm/ScmPanel";
import { TitleBar } from "./TitleBar";
import { Sidebar, type SidebarMode } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { StatusBar } from "./StatusBar";

function ShellChrome() {
  const { save, closeTab, activePath, openFolder, rootPath } = useWorkspace();
  const { toggleTheme } = useTheme();
  const { findInFile } = useEditorActions();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("explorer");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [gitBranch, setGitBranch] = useState<string | null>(null);

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
  const openSearch = useCallback(() => setSidebarMode("search"), []);
  const toggleTerminal = useCallback(
    () => setTerminalOpen((open) => !open),
    [],
  );

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

      if (event.key === "Escape" && paletteOpen) {
        event.preventDefault();
        closePalette();
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
    closePalette,
    openPalette,
    openSearch,
    findInFile,
    save,
    activePath,
    closeTab,
    openFolder,
    toggleTheme,
    toggleTerminal,
  ]);

  return (
    <div className="app-shell">
      <TitleBar onOpenPalette={openPalette} />
      <div className="app-shell__workspace">
        <Sidebar
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          onBranch={setGitBranch}
        />
        <div className="app-shell__main">
          <EditorArea />
          <TerminalPanel open={terminalOpen} />
        </div>
      </div>
      <StatusBar
        terminalOpen={terminalOpen}
        onToggleTerminal={toggleTerminal}
        gitBranch={gitBranch}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        context={commandContext}
      />
    </div>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <EditorActionsProvider>
        <ShellChrome />
      </EditorActionsProvider>
    </WorkspaceProvider>
  );
}
