import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import "./AppShell.css";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import {
  EditorActionsProvider,
  useEditorActions,
} from "../editor/EditorActions";
import { DiagnosticsProvider } from "../lsp/DiagnosticsContext";
import { AiProvider, useAi } from "../ai/AiContext";
import { AiPanel } from "../ai/AiPanel";
import { ExtensionsProvider, useExtensions } from "../extensions/ExtensionsContext";
import { collectContributions, registerExtraLanguages } from "../extensions/contributions";
import * as monaco from "monaco-editor";
import { DebugProvider } from "../debug/DebugContext";
import { SettingsProvider, useSettings } from "../settings/SettingsContext";
import { SettingsPanel } from "../settings/SettingsPanel";
import { NotificationsProvider, useNotifications } from "../notifications/NotificationsContext";
import { AutoSave } from "../workspace/AutoSave";
import { CommandPalette } from "../commands/CommandPalette";
import { COMMANDS } from "../commands/registry";
import type { Command, CommandContext } from "../commands/types";
import type { GitBranchInfo, GitSummary } from "../scm/ScmPanel";
import { appendLog, clearLogs as clearLogBuffer } from "../logs/logBus";
import { basename, isUntitledPath, languageFromPath, parentPath } from "../workspace/path";
import { requestRunFile } from "../terminal/runFile";
import { setShowTerminalListener } from "../terminal/runCommand";
import { requestClearAllTerminals, requestClearActiveTerminal } from "../terminal/clearAll";
import { requestNewTerminal } from "../terminal/newTerminal";
import { requestKillActiveTerminal } from "../terminal/killTerminal";
import { requestDuplicateTerminal } from "../terminal/duplicateTerminal";
import { requestFocusTerminal } from "../terminal/focusTerminal";
import { requestRenameActiveTerminal } from "../terminal/renameTerminal";
import { requestRestartActiveTerminal } from "../terminal/restartTerminal";
import { relativeToRoot } from "../workspace/path";
import { rootForPath } from "../ai/roots";
import { requestSplitEditor } from "./splitBus";
import { useFileDrop } from "../workspace/fileDrop";
import { requestToggleAmend } from "../scm/amendBus";
import { requestScmRemote } from "../scm/scmRemoteBus";
import { requestCycleProblemsFilter } from "../lsp/problemsFilterBus";
import { recentFiles, recentFolders } from "../workspace/history";
import { listWorkspaceFiles } from "../search/workspaceSearch";
import { symbolsForFile } from "../lsp/OutlinePanel";
import { scanOutline } from "../lsp/outlineScan";
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
    closeOtherEditors,
    closeSavedEditors,
    activePath,
    openFolder,
    openFolderAt,
    addFolderRoot,
    addFolderRootPath,
    removeFolderRoot,
    reopenRemovedRoot,
    closeFolder,
    openFile,
    openDroppedPaths,
    openUntitled,
    openFileAt,
    reopenClosed,
    document,
    tabs,
    rootPath,
    roots,
    refreshExplorer,
    collapseExplorer,
    expandExplorer,
    explorerNonce,
    revealInExplorer,
    togglePinTab,
  } = useWorkspace();
  useFileDrop(openDroppedPaths);
  const { toggleTheme, setExtras } = useTheme();
  const { settings, updateEditor } = useSettings();
  const { clearAttachments, clearChat, exportSession, importSession, newChat } = useAi();
  const { findInFile, findInSelection, replaceInSelection, runEditorCommand } = useEditorActions();
  const { push: notify } = useNotifications();
  const { extensions } = useExtensions();
  useEffect(() => {
    const collected = collectContributions(extensions);
    setExtras(collected.themes);
    registerExtraLanguages(collected.languages, (language) => {
      monaco.languages.register({
        id: language.id,
        aliases: language.aliases,
        extensions: language.extensions,
      });
    });
  }, [extensions, setExtras]);
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
    toggleBottom,
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
  const [gitAhead, setGitAhead] = useState<number | null>(null);
  const [gitBehind, setGitBehind] = useState<number | null>(null);
  const [gitDirtyCount, setGitDirtyCount] = useState(0);
  const [treeFilter, setTreeFilter] = useState("");
  const [hideDotfiles, setHideDotfiles] = useState(false);

  const applyGitInfo = useCallback((info: GitBranchInfo | null) => {
    if (!info) {
      setGitBranch(null);
      setGitAhead(null);
      setGitBehind(null);
      setGitDirtyCount(0);
      return;
    }
    setGitBranch(info.branch);
    setGitAhead(info.ahead);
    setGitBehind(info.behind);
    setGitDirtyCount(info.dirtyCount);
  }, []);

  useEffect(() => {
    if (explorerNonce === 0) return;
    setSidebarMode("explorer");
    setSidebarOpen(true);
  }, [explorerNonce, setSidebarOpen]);

  useEffect(() => {
    if (!rootPath) {
      applyGitInfo(null);
      return;
    }
    let cancelled = false;
    void invoke<GitSummary>("git_summary", { cwd: rootPath })
      .then((summary) => {
        if (!cancelled) {
          applyGitInfo({
            branch: summary.branch,
            ahead: summary.ahead ?? null,
            behind: summary.behind ?? null,
            dirtyCount: summary.entries?.length ?? 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) applyGitInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath, applyGitInfo]);

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

  const openWorkspaceSymbols = useCallback(() => {
    setPaletteSeed("Go to Symbol in Workspace");
    setPaletteOpen(true);
    void (async () => {
      const cmds: Command[] = [];
      const seen = new Set<string>();
      const add = (
        path: string,
        symbol: { name: string; kind: string; line: number },
      ) => {
        const id = `wsym:${path}:${symbol.line}:${symbol.name}`;
        if (seen.has(id) || cmds.length >= 200) return;
        seen.add(id);
        cmds.push({
          id,
          title: `${symbol.name} — ${basename(path)}`,
          category: `Workspace · ${symbol.kind}`,
          run: () => void openFileAt(path, symbol.line, 1),
        });
      };

      for (const tab of tabs) {
        const symbols = await symbolsForFile(tab.path, tab.value, tab.language);
        for (const symbol of symbols.slice(0, 40)) add(tab.path, symbol);
      }

      const folderList = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
      if (folderList.length > 0 && cmds.length < 200) {
        const openKeys = new Set(
          tabs.map((tab) => tab.path.replace(/\\/g, "/").toLowerCase()),
        );
        const files = await listWorkspaceFiles(folderList);
        for (const path of files.slice(0, 160)) {
          if (cmds.length >= 200) break;
          const key = path.replace(/\\/g, "/").toLowerCase();
          if (openKeys.has(key)) continue;
          if (!/\.(ts|tsx|js|jsx|mjs|cjs|rs|py|go|java|md)$/i.test(path)) continue;
          try {
            const text = await readTextFile(path);
            const language = languageFromPath(path);
            for (const symbol of scanOutline(text, language).slice(0, 16)) {
              add(path, symbol);
            }
          } catch {
            /* skip unreadable */
          }
        }
      }
      setSymbolCommands(cmds);
    })();
  }, [tabs, roots, rootPath, openFileAt]);

  const openGoToFile = useCallback(() => {
    const folderList = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
    if (folderList.length === 0) {
      setSymbolCommands([]);
      setPaletteSeed("");
      setPaletteOpen(true);
      return;
    }
    setPaletteSeed("");
    setPaletteOpen(true);
    void listWorkspaceFiles(folderList).then((files) => {
      setSymbolCommands(
        files.slice(0, 400).map((path) => ({
          id: `file:${path}`,
          title: `Go to File — ${basename(path)}`,
          category: "File",
          run: () => void openFile(path),
        })),
      );
    });
  }, [roots, rootPath, openFile]);

  const openKeybindings = useCallback(() => {
    setSymbolCommands(
      COMMANDS.filter((cmd) => cmd.keybinding).map((cmd) => ({
        id: `kb:${cmd.id}`,
        title: `${cmd.keybinding} — ${cmd.title}`,
        category: "Keybinding",
        run: () => undefined,
      })),
    );
    setPaletteSeed("");
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    const onKeybindings = () => openKeybindings();
    window.addEventListener("t3d:keybindings", onKeybindings);
    return () => window.removeEventListener("t3d:keybindings", onKeybindings);
  }, [openKeybindings]);

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
    appendLog(`Cloned repository into ${dest}`);
    await openFolderAt(dest);
    notify("Repository cloned", {
      detail: dest,
      action: {
        label: "Reveal Explorer",
        run: () => {
          setSidebarMode("explorer");
          setSidebarOpen(true);
        },
      },
    });
  }, [openFolderAt, notify, setSidebarOpen]);

  const openSearch = useCallback(() => {
    setSidebarMode("search");
    setSidebarOpen(true);
  }, [setSidebarOpen]);
  const openExtensions = useCallback(() => setSidebarMode("extensions"), []);
  const openDebug = useCallback(() => setSidebarMode("debug"), []);

  useEffect(() => {
    setShowTerminalListener(() => {
      setPanelTab("terminal");
      setBottomOpen(true);
    });
    return () => setShowTerminalListener(null);
  }, [setBottomOpen]);

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

  const openLogs = useCallback(() => {
    setPanelTab("logs");
    setBottomOpen(true);
  }, [setBottomOpen]);

  const toggleProblems = useCallback(() => {
    if (bottomOpen && panelTab === "problems") {
      setBottomOpen(false);
      return;
    }
    setPanelTab("problems");
    setBottomOpen(true);
  }, [bottomOpen, panelTab, setBottomOpen]);

  const extensionCommands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    for (const ext of extensions) {
      if (!ext.enabled) continue;
      for (const contrib of ext.contributes?.commands ?? []) {
        cmds.push({
          id: contrib.id,
          title: contrib.title,
          category: "Extension",
          run: (ctx) => {
            const action = contrib.runs?.trim();
            if (action === "open-folder") {
              void ctx.openFolder();
              return;
            }
            if (action === "toggle-theme") {
              ctx.toggleTheme();
              return;
            }
            if (action === "new-terminal") {
              ctx.toggleTerminal();
              return;
            }
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
      addFolderRoot,
      addActiveFolderRoot: async () => {
        if (!activePath) return;
        const folder = parentPath(activePath);
        if (!folder) return;
        await addFolderRootPath(folder);
      },
      removeFolderRoot,
      reopenRemovedRoot,
      closeFolder,
      openGoToFile,
      openKeybindings,
      refreshExplorer,
      collapseExplorer,
      expandExplorer,
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
      closeOtherEditors,
      closeSavedEditors,
      pinActiveEditor: () => {
        if (!activePath) return;
        const tab = tabs.find((item) => item.path === activePath);
        if (tab && !tab.pinned) togglePinTab(activePath);
      },
      unpinActiveEditor: () => {
        if (!activePath) return;
        const tab = tabs.find((item) => item.path === activePath);
        if (tab?.pinned) togglePinTab(activePath);
      },
      activeEditorPinned: Boolean(
        activePath && tabs.find((item) => item.path === activePath)?.pinned,
      ),
      copyActivePath: () => {
        if (activePath) void navigator.clipboard.writeText(activePath);
      },
      copyActiveRelativePath: () => {
        if (!activePath) return;
        const list = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
        const root = rootForPath(list, activePath) ?? rootPath;
        void navigator.clipboard.writeText(relativeToRoot(root, activePath));
      },
      toggleTheme,
      toggleMinimap: () => updateEditor({ minimap: !settings.editor.minimap }),
      toggleStickyScroll: () =>
        updateEditor({ stickyScroll: !settings.editor.stickyScroll }),
      toggleWordWrap: () =>
        updateEditor({ wordWrap: !settings.editor.wordWrap }),
      toggleRenderWhitespace: () =>
        updateEditor({
          renderWhitespace: !settings.editor.renderWhitespace,
        }),
      toggleRelativeLineNumbers: () => {
        if (!settings.editor.lineNumbers) {
          updateEditor({ lineNumbers: true, relativeLineNumbers: true });
          return;
        }
        updateEditor({
          relativeLineNumbers: !settings.editor.relativeLineNumbers,
        });
      },
      toggleInsertFinalNewline: () =>
        updateEditor({
          insertFinalNewline: !settings.editor.insertFinalNewline,
        }),
      toggleTrimTrailingWhitespace: () =>
        updateEditor({
          trimTrailingWhitespace: !settings.editor.trimTrailingWhitespace,
        }),
      cycleAutoSave: () => {
        const order = [0, 1000, 2000, 5000];
        const idx = order.indexOf(settings.editor.autoSaveMs);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 0;
        updateEditor({ autoSaveMs: next });
      },
      cycleFontSize: () => {
        const order = [12, 13, 14, 16, 18];
        const idx = order.indexOf(settings.editor.fontSize);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 14;
        updateEditor({ fontSize: next });
      },
      cycleCursorStyle: () => {
        const order = ["line", "block", "underline"] as const;
        const idx = order.indexOf(settings.editor.cursorStyle);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? "line";
        updateEditor({ cursorStyle: next });
      },
      cycleTabSize: () => {
        const current = settings.editor.tabSize;
        const next = current === 2 ? 4 : current === 4 ? 8 : 2;
        updateEditor({ tabSize: next });
      },
      cycleTerminalFontSize: () => {
        const order = [12, 13, 14, 16, 18];
        const idx = order.indexOf(settings.editor.terminalFontSize);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 13;
        updateEditor({ terminalFontSize: next });
      },
      toggleLineNumbers: () =>
        updateEditor({
          lineNumbers: !settings.editor.lineNumbers,
          ...(settings.editor.lineNumbers
            ? { relativeLineNumbers: false }
            : {}),
        }),
      openPalette,
      openSymbols,
      openWorkspaceSymbols,
      closePalette,
      findInFile,
      findInSelection,
      replaceInSelection,
      splitEditorRight: () => requestSplitEditor("right"),
      closeEditorGroup: () => requestSplitEditor("close"),
      runEditorCommand,
      revealActiveFile: () => {
        if (activePath) void revealInExplorer(activePath);
      },
      openSearch,
      toggleTerminal,
      toggleBottomPanel: () => toggleBottom(),
      clearAllTerminals: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestClearAllTerminals();
      },
      clearActiveTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestClearActiveTerminal();
      },
      newTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestNewTerminal();
      },
      killActiveTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestKillActiveTerminal();
      },
      duplicateTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestDuplicateTerminal();
      },
      focusNextTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestFocusTerminal("next");
      },
      focusPreviousTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestFocusTerminal("previous");
      },
      renameActiveTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestRenameActiveTerminal();
      },
      restartActiveTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestRestartActiveTerminal();
      },
      runFile: () => {
        if (!activePath) return;
        requestRunFile(activePath);
        setPanelTab("terminal");
        setBottomOpen(true);
      },
      openProblems,
      openLogs,
      toggleProblems,
      toggleScmAmend: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestToggleAmend();
      },
      toggleAi,
      openExtensions,
      openDebug,
      openSettings,
      toggleSidebar,
      clearAiAttachments: () => clearAttachments(),
      clearAiChat: () => clearChat(),
      exportAiSession: () => {
        setAiOpen(true);
        exportSession();
      },
      importAiSession: () => {
        setAiOpen(true);
        void importSession();
      },
      newAiChat: () => {
        setAiOpen(true);
        newChat();
      },
      showExplorer: () => {
        setSidebarMode("explorer");
        setSidebarOpen(true);
      },
      showSearch: () => {
        setSidebarMode("search");
        setSidebarOpen(true);
      },
      showScm: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
      },
      showOutline: () => {
        setSidebarMode("outline");
        setSidebarOpen(true);
      },
      reopenLastFolder: () => {
        const last = recentFolders()[0];
        if (last) void openFolderAt(last);
      },
      showWelcome: () => closeFolder(),
      openAi: () => setAiOpen(true),
      gitPull: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("pull");
      },
      gitPush: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("push");
      },
      gitFetch: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("fetch");
      },
      gitStash: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("stash");
      },
      gitStashPop: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("stashPop");
      },
      openUntitled: () => openUntitled(),
      cycleProblemsFilter: () => {
        setPanelTab("problems");
        setBottomOpen(true);
        requestCycleProblemsFilter();
      },
      focusActiveTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestFocusTerminal("active");
      },
      duplicateEditorToSide: () => {
        if (!activePath) return;
        requestSplitEditor("right");
      },
      gitCreateBranch: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("createBranch");
      },
      gitCheckout: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("checkout");
      },
      cycleRulers: () => {
        const order = ["", "80", "100", "120"];
        const current = settings.editor.rulers.trim();
        const idx = order.indexOf(current);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? "";
        updateEditor({ rulers: next });
      },
      cycleWordWrapColumn: () => {
        const order = [80, 100, 120];
        const idx = order.indexOf(settings.editor.wordWrapColumn);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 80;
        updateEditor({ wordWrapColumn: next });
      },
      clearLogs: () => {
        setPanelTab("logs");
        setBottomOpen(true);
        clearLogBuffer();
      },
      revealActiveFileInOs: () => {
        if (!activePath || isUntitledPath(activePath)) return;
        void revealItemInDir(activePath).catch(() => {
          /* ignore opener failures */
        });
      },
    }),
    [
      openFolder,
      addFolderRoot,
      addFolderRootPath,
      activePath,
      removeFolderRoot,
      reopenRemovedRoot,
      closeFolder,
      openGoToFile,
      openKeybindings,
      refreshExplorer,
      collapseExplorer,
      expandExplorer,
      cloneRepository,
      openFolderAt,
      openFile,
      openUntitled,
      reopenClosed,
      save,
      saveAs,
      saveAll,
      closeAll,
      closeOtherEditors,
      closeSavedEditors,
      togglePinTab,
      tabs,
      roots,
      rootPath,
      activePath,
      closeTab,
      toggleTheme,
      settings.editor.minimap,
      settings.editor.stickyScroll,
      settings.editor.wordWrap,
      settings.editor.renderWhitespace,
      settings.editor.lineNumbers,
      settings.editor.relativeLineNumbers,
      settings.editor.insertFinalNewline,
      settings.editor.trimTrailingWhitespace,
      settings.editor.autoSaveMs,
      settings.editor.fontSize,
      settings.editor.cursorStyle,
      settings.editor.tabSize,
      settings.editor.terminalFontSize,
      settings.editor.lineNumbers,
      settings.editor.rulers,
      settings.editor.wordWrapColumn,
      updateEditor,
      clearAttachments,
      clearChat,
      exportSession,
      importSession,
      newChat,
      setAiOpen,
      setSidebarOpen,
      toggleBottom,
      toggleProblems,
      openFolderAt,
      openPalette,
      openSymbols,
      openWorkspaceSymbols,
      closePalette,
      findInFile,
      findInSelection,
      replaceInSelection,
      runEditorCommand,
      revealInExplorer,
      openSearch,
      toggleTerminal,
      setBottomOpen,
      openProblems,
      openLogs,
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

      if (event.altKey && event.shiftKey && key === "f" && !mod) {
        event.preventDefault();
        runEditorCommand("format");
        clearChord();
        return;
      }

      if (event.altKey && event.shiftKey && key === "a" && !mod) {
        event.preventDefault();
        runEditorCommand("blockComment");
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

      if (event.altKey && event.shiftKey && !mod && (key === "arrowup" || event.code === "ArrowUp")) {
        event.preventDefault();
        runEditorCommand("copyLineUp");
        clearChord();
        return;
      }

      if (mod && !event.shiftKey && key === "n") {
        event.preventDefault();
        openUntitled();
        clearChord();
        return;
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

      if (mod && !event.shiftKey && key === "d") {
        event.preventDefault();
        runEditorCommand("addNextMatch");
        clearChord();
        return;
      }

      if (mod && !event.shiftKey && key === "t") {
        event.preventDefault();
        openWorkspaceSymbols();
        clearChord();
        return;
      }

      if (mod && !event.shiftKey && key === "p") {
        event.preventDefault();
        openGoToFile();
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
        if (mod) openKeybindings();
        else void saveAll();
        clearChord();
        return;
      }

      if (chord === "ctrl+k" && key === "w") {
        event.preventDefault();
        closeAll();
        clearChord();
        return;
      }

      if (chord === "ctrl+k" && key === "i") {
        event.preventDefault();
        runEditorCommand("hover");
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
        if (key === "i") {
          event.preventDefault();
          runEditorCommand("hover");
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
    openWorkspaceSymbols,
    openGoToFile,
    openKeybindings,
    reopenClosed,
    openUntitled,
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
            onBranch={applyGitInfo}
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
        gitAhead={gitAhead}
        gitBehind={gitBehind}
        gitDirtyCount={gitDirtyCount}
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
          <NotificationsProvider>
            <AiProvider>
              <ExtensionsProvider>
                <DebugProvider>
                  <SettingsProvider>
                    <AutoSave />
                    <LayoutProvider>
                      <ShellChrome />
                    </LayoutProvider>
                  </SettingsProvider>
                </DebugProvider>
              </ExtensionsProvider>
            </AiProvider>
          </NotificationsProvider>
        </DiagnosticsProvider>
      </EditorActionsProvider>
    </WorkspaceProvider>
  );
}
