import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir, openUrl } from "@tauri-apps/plugin-opener";
import { applyChromeAcrylic } from "./chromeAcrylic";
import { openSettingsWindow } from "../settings/openSettingsWindow";
import "./AppShell.css";
import { editorConfigFor } from "../editor/editorconfig";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import { useTheme } from "../theme/ThemeContext";
import {
  EditorActionsProvider,
  useEditorActions,
} from "../editor/EditorActions";
import { DiagnosticsProvider, useDiagnostics } from "../lsp/DiagnosticsContext";
import { AiProvider, useAi } from "../ai/AiContext";
import { AiPanel } from "../ai/AiPanel";
import { ExtensionsProvider, useExtensions } from "../extensions/ExtensionsContext";
import { collectContributions, registerExtraLanguages } from "../extensions/contributions";
import { extensionHost } from "../extensions/host/extensionHost";
import type { WorkspaceSnapshot } from "../extensions/host/protocol";
import * as monaco from "monaco-editor";
import { DebugProvider, useDebug } from "../debug/DebugContext";
import { SettingsProvider, useSettings } from "../settings/SettingsContext";
import { SettingsPanel } from "../settings/SettingsPanel";
import { NotificationsProvider, useNotifications } from "../notifications/NotificationsContext";
import { X } from "lucide-react";
import { AutoSave } from "../workspace/AutoSave";
import { CommandPalette } from "../commands/CommandPalette";
import { COMMANDS } from "../commands/registry";
import type { Command, CommandContext } from "../commands/types";
import type { GitBranchInfo, GitSummary } from "../scm/ScmPanel";
import { appendLog, clearLogs as clearLogBuffer } from "../logs/logBus";
import { languageLabel, PICKABLE_LANGUAGES } from "../editor/languages";
import { readRunCommands, setRunCommand } from "../terminal/runConfig";
import {
  githubIssuesSearchUrl,
  githubPullsSearchUrl,
  githubWebUrlFromRemote,
} from "../scm/githubRemote";
import { parseWorkspace, serializeWorkspace } from "../workspace/workspaceFile";
import { basename, isVirtualPath, joinPath, languageFromPath, parentPath } from "../workspace/path";
import { requestRunFile } from "../terminal/runFile";
import { setShowTerminalListener } from "../terminal/runCommand";
import { requestClearAllTerminals, requestClearActiveTerminal } from "../terminal/clearAll";
import { requestNewTerminal } from "../terminal/newTerminal";
import { requestKillActiveTerminal } from "../terminal/killTerminal";
import { requestDuplicateTerminal } from "../terminal/duplicateTerminal";
import { requestSplitTerminal } from "../terminal/splitTerminal";
import { requestFocusTerminal } from "../terminal/focusTerminal";
import { requestRenameActiveTerminal } from "../terminal/renameTerminal";
import { requestRestartActiveTerminal } from "../terminal/restartTerminal";
import { relativeToRoot } from "../workspace/path";
import { rootForPath } from "../ai/roots";
import { requestSplitEditor } from "./splitBus";
import { useFileDrop } from "../workspace/fileDrop";
import { requestToggleAmend } from "../scm/amendBus";
import { requestScmRemote } from "../scm/scmRemoteBus";
import { readIgnoreSpacePref, writeIgnoreSpacePref } from "../scm/diffPrefs";
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
    closeEditorsToTheRight,
    closeEditorsToTheLeft,
    activePath,
    openFolder,
    openFolderAt,
    addFolderRoot,
    addFolderRootPath,
    removeFolderRoot,
    reopenRemovedRoot,
    closeFolder,
    restoreRecentSession,
    openFile,
    openDroppedPaths,
    openUntitled,
    openWebview: openWebviewTab,
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
    createEntry,
    setEol,
    renameEntry,
    deleteEntry,
    setLanguageAt,
    activateTab,
    selectionText,
    applyDiskValue,
  } = useWorkspace();
  useFileDrop(openDroppedPaths);
  const { toggleTheme, setExtras } = useTheme();
  const { settings, updateEditor, updateChromeAcrylic, updateApp, reset: resetEditorSettings } =
    useSettings();

  useEffect(() => {
    void applyChromeAcrylic(settings.chromeAcrylic);
  }, [settings.chromeAcrylic]);
  const {
    clearAttachments,
    clearChat,
    exportSession,
    importSession,
    newChat,
    setSettings,
    settings: aiSettings,
    showHistory,
    setShowHistory,
    cycleEffort,
    stop,
    regenerate,
    attachPath,
    attachFiles,
    deleteSession,
    activeSessionId,
    messages,
  } = useAi();
  const { findInFile, findInSelection, replaceInSelection, runEditorCommand } = useEditorActions();
  const {
    push: notify,
    clear: clearNotificationsList,
    markRead: markNotificationsReadList,
    dismiss: dismissNotification,
    items: notificationItems,
    unread: notificationUnread,
  } = useNotifications();
  const [toastIds, setToastIds] = useState<string[]>([]);

  useEffect(() => {
    if (notificationItems.length === 0) return;
    const latest = notificationItems[0];
    if (!latest) return;
    const isRecent = Date.now() - latest.createdAt < 3000;
    if (isRecent) {
      setToastIds((prev) => (prev.includes(latest.id) ? prev : [latest.id, ...prev].slice(0, 3)));
      const timer = window.setTimeout(() => {
        setToastIds((prev) => prev.filter((id) => id !== latest.id));
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [notificationItems]);
  const { problems, refresh: refreshDiagnosticsMarkers } = useDiagnostics();
  const {
    sessions: debugSessions,
    breakpoints: debugBreakpoints,
    startSession: startDebugSession,
    stopSession: stopDebugSession,
    stepPython: stepDebugPython,
    pythonStop: debugPythonStop,
    addBreakpoint,
    removeBreakpoint,
    clearBreakpoints,
    setAllBreakpointsEnabled,
  } = useDebug();
  const {
    extensions,
    scaffoldInFolder,
    installFromFolder,
    installSample,
    refresh: reloadExtensions,
  } = useExtensions();
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
  const zenRestoreRef = useRef<{
    sidebarOpen: boolean;
    aiOpen: boolean;
    bottomOpen: boolean;
  } | null>(null);

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

  const quickPickResolverRef = useRef<((value: string | undefined) => void) | null>(null);
  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    const resolve = quickPickResolverRef.current;
    if (resolve) {
      quickPickResolverRef.current = null;
      window.setTimeout(() => resolve(undefined), 0);
    }
  }, []);

  const resolveGithubRepoUrl = useCallback(async (): Promise<string | null> => {
    if (!rootPath) {
      notify("GitHub", "Open a folder that is a GitHub repository first.");
      return null;
    }
    try {
      const remote = await invoke<string>("git_remote_origin", { cwd: rootPath });
      const web = githubWebUrlFromRemote(remote);
      if (!web) {
        notify("GitHub", "Origin remote is not a GitHub URL.");
        return null;
      }
      return web;
    } catch {
      notify("GitHub", "Could not read git remote origin.");
      return null;
    }
  }, [rootPath, notify]);

  const [settingsCategory, setSettingsCategory] = useState<"appearance" | "editor" | "ai">("editor");
  const openSettings = useCallback((tab?: "appearance" | "editor" | "ai") => {
    const next = tab ?? "editor";
    setSettingsCategory(next);
    void openSettingsWindow(next).then((opened) => {
      if (!opened) setSettingsOpen(true);
    });
  }, []);
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

  useEffect(() => {
    extensionHost.setManifests(extensions);
  }, [extensions]);

  const startupFiredRef = useRef(false);
  useEffect(() => {
    if (startupFiredRef.current || extensions.length === 0) return;
    startupFiredRef.current = true;
    window.setTimeout(() => extensionHost.fireEvent("onStartupFinished"), 1500);
  }, [extensions]);

  useEffect(() => {
    if (document?.language) extensionHost.fireEvent(`onLanguage:${document.language}`);
  }, [document?.language]);

  const extensionCommands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    for (const ext of extensions) {
      if (!ext.enabled) continue;
      for (const contrib of ext.contributes?.commands ?? []) {
        cmds.push({
          id: contrib.id,
          title: contrib.title,
          category: ext.name,
          run: (ctx) => {
            const action = contrib.runs?.trim();
            if (!action && ext.main) {
              void extensionHost.executeCommand(contrib.id).catch((error: unknown) => {
                notify(ext.name, error instanceof Error ? error.message : String(error));
              });
              return;
            }
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
            notify(ext.name, `${contrib.title} has no handler: add "main" code or a "runs" action.`);
          },
        });
      }
      for (const webview of ext.contributes?.webviews ?? []) {
        cmds.push({
          id: `t3d.extview.${ext.id}.${webview.id}`,
          title: webview.title,
          category: ext.name,
          run: () => {
            openWebviewTab(ext.id, webview.id, webview.title);
          },
        });
      }
    }
    return cmds;
  }, [extensions, notify, openWebviewTab]);

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
      closeWorkspace: () => {
        const count = roots.length || (rootPath ? 1 : 0);
        if (count === 0) {
          notify("Close Workspace", "No folders are open.");
          return;
        }
        closeFolder();
        notify("Workspace closed", `Closed ${count} folder${count === 1 ? "" : "s"}.`);
      },
      restoreRecentSession: async () => {
        const restored = await restoreRecentSession();
        notify(
          "Restore Recent Session",
          restored ? "Reopened folders and editors." : "There is no recent session to restore.",
        );
      },
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
      closeEditorsToTheRight,
      closeEditorsToTheLeft,
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
      splitEditorDown: () => requestSplitEditor("down"),
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
      splitTerminal: () => {
        setPanelTab("terminal");
        setBottomOpen(true);
        requestSplitTerminal();
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
      saveWorkspaceAs: () => {
        void (async () => {
          const folderList =
            roots.length > 0 ? roots : rootPath ? [rootPath] : [];
          if (folderList.length === 0) {
            notify("Workspace", "Open a folder before saving a workspace.");
            return;
          }
          const dest = await saveDialog({
            title: "Save Workspace As",
            defaultPath: `${basename(folderList[0])}.t3d-workspace.json`,
            filters: [
              { name: "T3D Workspace", extensions: ["t3d-workspace.json", "json"] },
            ],
          });
          if (!dest) return;
          try {
            const text = serializeWorkspace({
              roots: folderList,
              tabs: tabs.map((tab) => tab.path),
              active: activePath,
            });
            await writeTextFile(dest, text);
            notify("Workspace", `Saved ${basename(dest)}`);
          } catch (err) {
            notify(
              "Workspace",
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
      },
      openWorkspaceFile: () => {
        void (async () => {
          const selected = await openDialog({
            multiple: false,
            title: "Open Workspace",
            filters: [
              { name: "T3D Workspace", extensions: ["t3d-workspace.json", "json"] },
            ],
          });
          if (selected === null) return;
          const path = Array.isArray(selected) ? selected[0] : selected;
          if (!path) return;
          try {
            const text = await readTextFile(path);
            const workspace = parseWorkspace(text);
            if (!workspace) {
              notify("Workspace", "Invalid workspace file.");
              return;
            }
            await openFolderAt(workspace.roots[0]);
            for (const extra of workspace.roots.slice(1)) {
              await addFolderRootPath(extra);
            }
            for (const tabPath of workspace.tabs ?? []) {
              await openFile(tabPath);
            }
            if (workspace.active) {
              await openFile(workspace.active);
            }
            notify("Workspace", `Opened ${basename(path)}`);
          } catch (err) {
            notify(
              "Workspace",
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
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
        if (!activePath || isVirtualPath(activePath)) return;
        void revealItemInDir(activePath).catch(() => {
          /* ignore opener failures */
        });
      },
      gitDiscardAll: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("discardAll");
      },
      gitStageAll: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("stageAll");
      },
      gitUnstageAll: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("unstageAll");
      },
      cycleAiMaxToolRounds: () => {
        const order = [4, 8, 12, 16, 24, 32];
        const idx = order.indexOf(aiSettings.maxToolRounds);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 8;
        setSettings({ maxToolRounds: next });
        setAiOpen(true);
      },
      revealActiveParentInExplorer: () => {
        if (!activePath || isVirtualPath(activePath)) return;
        const parent = parentPath(activePath);
        if (!parent) return;
        setSidebarMode("explorer");
        setSidebarOpen(true);
        void revealInExplorer(parent);
      },
      gitCopyRelativePaths: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("copyRelative");
      },
      gitCopyAbsolutePaths: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("copyAbsolute");
      },
      gitOpenSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("openSelected");
      },
      cycleAiRequestTimeout: () => {
        const order = [0, 30, 60, 120];
        const idx = order.indexOf(aiSettings.requestTimeoutSec);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? 0;
        setSettings({ requestTimeoutSec: next });
        setAiOpen(true);
      },
      toggleAiStopOnToolError: () => {
        setSettings({ stopOnToolError: !aiSettings.stopOnToolError });
        setAiOpen(true);
      },
      gitSelectAll: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("selectAll");
      },
      gitDeselectAll: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("deselectAll");
      },
      gitStageSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("stageSelected");
      },
      gitUnstageSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("unstageSelected");
      },
      gitDiscardSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("discardSelected");
      },
      gitCopyBranch: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("copyBranch");
      },
      cycleAiTemperature: () => {
        const order: Array<number | null> = [null, 0, 0.2, 0.7, 1];
        const current = aiSettings.temperature;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ temperature: next });
        setAiOpen(true);
      },
      toggleAiShowHistory: () => {
        setShowHistory(!showHistory);
        setAiOpen(true);
      },
      gitIgnoreSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("ignoreSelected");
      },
      gitCompareSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("compareSelected");
      },
      cycleAiTopP: () => {
        const order: Array<number | null> = [null, 0.5, 0.9, 1];
        const current = aiSettings.topP;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ topP: next });
        setAiOpen(true);
      },
      cycleAiMaxTokens: () => {
        const order: Array<number | null> = [null, 1024, 2048, 4096, 8192];
        const current = aiSettings.maxTokens;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ maxTokens: next });
        setAiOpen(true);
      },
      cycleAiPresencePenalty: () => {
        const order: Array<number | null> = [null, 0, 0.5, 1];
        const current = aiSettings.presencePenalty;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ presencePenalty: next });
        setAiOpen(true);
      },
      focusScm: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
      },
      cycleAiFrequencyPenalty: () => {
        const order: Array<number | null> = [null, 0, 0.5, 1];
        const current = aiSettings.frequencyPenalty;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ frequencyPenalty: next });
        setAiOpen(true);
      },
      focusAiSystemPrompt: () => {
        openSettings();
        window.setTimeout(() => {
          window.document.getElementById("settings-ai-system-prompt")?.focus();
        }, 0);
      },
      gitRevealSelected: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("revealSelected");
      },
      gitRefresh: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("refresh");
      },
      toggleDiffIgnoreWhitespace: () => {
        writeIgnoreSpacePref(!readIgnoreSpacePref());
      },
      focusExplorer: () => {
        setSidebarMode("explorer");
        setSidebarOpen(true);
      },
      focusSearch: () => {
        setSidebarMode("search");
        setSidebarOpen(true);
      },
      focusExtensions: () => {
        setSidebarMode("extensions");
        setSidebarOpen(true);
      },
      focusDebug: () => {
        setSidebarMode("debug");
        setSidebarOpen(true);
      },
      focusOutline: () => {
        setSidebarMode("outline");
        setSidebarOpen(true);
      },
      cycleFontFamily: () => {
        const order = [
          "Cascadia Code, Consolas, Courier New, monospace",
          "JetBrains Mono, Consolas, monospace",
          "Fira Code, Consolas, monospace",
          "Consolas, Courier New, monospace",
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        ];
        const current = settings.editor.fontFamily;
        const idx = order.indexOf(current);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? order[0];
        updateEditor({ fontFamily: next });
      },
      gitFocusCommitMessage: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("focusCommitMessage");
      },
      cycleAiEffort: () => {
        cycleEffort();
        setAiOpen(true);
      },
      stopAi: () => {
        stop();
        setAiOpen(true);
      },
      regenerateAi: () => {
        setAiOpen(true);
        void regenerate();
      },
      attachActiveToAi: () => {
        if (!activePath) return;
        const tab = tabs.find((item) => item.path === activePath);
        if (!tab) return;
        attachPath(tab.path, tab.title, tab.value.slice(0, 12000));
        setAiOpen(true);
      },
      toggleLogs: () => {
        if (bottomOpen && panelTab === "logs") {
          setBottomOpen(false);
          return;
        }
        setPanelTab("logs");
        setBottomOpen(true);
      },
      attachFilesToAi: () => {
        setAiOpen(true);
        void attachFiles();
      },
      deleteAiSession: () => {
        deleteSession(activeSessionId);
        setAiOpen(true);
      },
      cycleAiModel: () => {
        const order = [
          "gpt-4o-mini",
          "gpt-4o",
          "gpt-4.1-mini",
          "o4-mini",
          "claude-sonnet-4-20250514",
        ];
        const idx = order.indexOf(aiSettings.model);
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? order[0];
        setSettings({ model: next });
        setAiOpen(true);
      },
      focusAiComposer: () => {
        setAiOpen(true);
        window.setTimeout(() => {
          window.document.getElementById("ai-composer-input")?.focus();
        }, 0);
      },
      gitPasteCommitMessage: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("pasteCommitMessage");
      },
      gitClearCommitMessage: () => {
        setSidebarMode("scm");
        setSidebarOpen(true);
        requestScmRemote("clearCommitMessage");
      },
      copyLastAiResponse: () => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          if (message?.role === "assistant" && message.content.trim()) {
            void navigator.clipboard.writeText(message.content);
            setAiOpen(true);
            return;
          }
        }
      },
      cycleAiSeed: () => {
        const order: Array<number | null> = [null, 0, 1, 42];
        const current = aiSettings.seed;
        const idx = order.findIndex(
          (value) =>
            value === current ||
            (value === null && current === null) ||
            (typeof value === "number" &&
              typeof current === "number" &&
              value === current),
        );
        const next = order[(idx >= 0 ? idx + 1 : 0) % order.length] ?? null;
        setSettings({ seed: next });
        setAiOpen(true);
      },
      focusAiSettings: () => {
        openSettings("ai");
        window.setTimeout(() => {
          (
            window.document.getElementById(
              "settings-ai-system-prompt",
            ) as HTMLTextAreaElement | null
          )?.focus();
        }, 50);
      },
      showGitSyncStatus: () => {
        const ahead = gitAhead ?? 0;
        const behind = gitBehind ?? 0;
        if (gitAhead === null && gitBehind === null) {
          notify("Git sync", "No upstream tracking information.");
          return;
        }
        notify("Git sync", `${ahead} ahead · ${behind} behind`);
      },
      resetAiPanelWidth: () => {
        setAiWidth(340);
        setAiOpen(true);
      },
      copyProblems: () => {
        if (problems.length === 0) {
          void navigator.clipboard.writeText("");
          return;
        }
        const lines = problems.map(
          (problem) =>
            `${problem.path}:${problem.line}:${problem.column} ${problem.severity} ${problem.message}`,
        );
        void navigator.clipboard.writeText(lines.join("\n"));
        openProblems();
      },
      copyWorkspaceRoot: () => {
        if (!rootPath) return;
        void navigator.clipboard.writeText(rootPath);
      },
      resetSidebarWidth: () => {
        setSidebarWidth(280);
        setSidebarOpen(true);
      },
      resetBottomPanelHeight: () => {
        setBottomHeight(220);
        setBottomOpen(true);
      },
      closeAi: () => {
        setAiOpen(false);
      },
      notifyProblemsCount: () => {
        const count = problems.length;
        notify(
          "Problems",
          count === 0 ? "No problems detected." : `${count} problem${count === 1 ? "" : "s"}.`,
        );
        openProblems();
      },
      refreshDiagnostics: () => {
        refreshDiagnosticsMarkers();
        openProblems();
      },
      copyGitBranchSync: () => {
        if (!gitBranch) return;
        const ahead = gitAhead ?? 0;
        const behind = gitBehind ?? 0;
        const sync =
          gitAhead === null && gitBehind === null
            ? gitBranch
            : `${gitBranch} +${ahead}/-${behind}`;
        void navigator.clipboard.writeText(sync);
      },
      resetAllLayoutSizes: () => {
        setSidebarWidth(280);
        setAiWidth(340);
        setBottomHeight(220);
      },
      openSidebar: () => {
        setSidebarOpen(true);
      },
      openBottomPanel: () => {
        setBottomOpen(true);
      },
      clearNotifications: () => {
        clearNotificationsList();
      },
      increaseFontSize: () => {
        updateEditor({
          fontSize: Math.min(32, settings.editor.fontSize + 1),
        });
      },
      decreaseFontSize: () => {
        updateEditor({
          fontSize: Math.max(8, settings.editor.fontSize - 1),
        });
      },
      notifyGitDirtyCount: () => {
        const count = gitDirtyCount;
        notify(
          "Git changes",
          count === 0
            ? "Working tree clean."
            : `${count} changed path${count === 1 ? "" : "s"}.`,
        );
        setSidebarMode("scm");
        setSidebarOpen(true);
      },
      closeBottomPanel: () => {
        setBottomOpen(false);
      },
      closeSidebar: () => {
        setSidebarOpen(false);
      },
      markNotificationsRead: () => {
        markNotificationsReadList();
      },
      increaseTerminalFontSize: () => {
        updateEditor({
          terminalFontSize: Math.min(32, settings.editor.terminalFontSize + 1),
        });
      },
      decreaseTerminalFontSize: () => {
        updateEditor({
          terminalFontSize: Math.max(8, settings.editor.terminalFontSize - 1),
        });
      },
      maximizeAiPanelWidth: () => {
        setAiWidth(560);
        setAiOpen(true);
      },
      minimizeAiPanelWidth: () => {
        setAiWidth(260);
        setAiOpen(true);
      },
      maximizeSidebarWidth: () => {
        setSidebarWidth(520);
        setSidebarOpen(true);
      },
      minimizeSidebarWidth: () => {
        setSidebarWidth(180);
        setSidebarOpen(true);
      },
      maximizeBottomPanelHeight: () => {
        setBottomHeight(480);
        setBottomOpen(true);
      },
      minimizeBottomPanelHeight: () => {
        setBottomHeight(120);
        setBottomOpen(true);
      },
      dismissLatestNotification: () => {
        const latest = notificationItems[0];
        if (latest) dismissNotification(latest.id);
      },
      notifyUnreadCount: () => {
        const count = notificationUnread;
        notify(
          "Notifications",
          count === 0
            ? "No unread notifications."
            : `${count} unread notification${count === 1 ? "" : "s"}.`,
        );
      },
      toggleMaximizeWindow: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        void getCurrentWindow().toggleMaximize();
      },
      minimizeWindow: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        void getCurrentWindow().minimize();
      },
      resetEditorSettings: () => {
        resetEditorSettings();
      },
      increaseSidebarWidth: () => {
        setSidebarWidth(sidebarWidth + 20);
        setSidebarOpen(true);
      },
      decreaseSidebarWidth: () => {
        setSidebarWidth(sidebarWidth - 20);
        setSidebarOpen(true);
      },
      copyLatestNotification: () => {
        const latest = notificationItems[0];
        if (!latest) {
          void navigator.clipboard.writeText("");
          return;
        }
        const text = latest.detail
          ? `${latest.title}\n${latest.detail}`
          : latest.title;
        void navigator.clipboard.writeText(text);
      },
      increaseBottomPanelHeight: () => {
        setBottomHeight(bottomHeight + 20);
        setBottomOpen(true);
      },
      decreaseBottomPanelHeight: () => {
        setBottomHeight(bottomHeight - 20);
        setBottomOpen(true);
      },
      increaseAiPanelWidth: () => {
        setAiWidth(aiWidth + 20);
        setAiOpen(true);
      },
      decreaseAiPanelWidth: () => {
        setAiWidth(aiWidth - 20);
        setAiOpen(true);
      },
      resetTerminalFontSize: () => {
        updateEditor({ terminalFontSize: 13 });
      },
      resetEditorFontSize: () => {
        updateEditor({ fontSize: 14 });
      },
      closeWindow: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        void getCurrentWindow().close();
      },
      quit: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        const unsaved = tabs.filter((tab) => tab.value !== tab.baseline).length;
        if (
          unsaved > 0 &&
          !window.confirm(
            `Quit T3D? ${unsaved} editor${unsaved === 1 ? " has" : "s have"} unsaved changes that will be lost.`,
          )
        ) {
          return;
        }
        void invoke("quit_app");
      },
      openWebview: (extId, viewId, title) => {
        openWebviewTab(extId, viewId, title);
      },
      copyUnreadNotificationCount: () => {
        void navigator.clipboard.writeText(String(notificationUnread));
      },
      startDebugging: () => {
        if (!activePath) return;
        setSidebarMode("debug");
        setSidebarOpen(true);
        void startDebugSession(activePath);
      },
      stopDebugging: () => {
        const active = debugSessions[0];
        if (active) void stopDebugSession(active.id);
      },
      restartDebugging: () => {
        if (!activePath) return;
        const active = debugSessions[0];
        if (active) {
          void stopDebugSession(active.id).then(() => startDebugSession(activePath));
        } else {
          void startDebugSession(activePath);
        }
      },
      stepOverDebugging: () => {
        void stepDebugPython("next").then((next) => {
          const frame = next?.frames[0];
          if (frame) void openFileAt(frame.file, frame.line, 1);
        });
      },
      stepIntoDebugging: () => {
        void stepDebugPython("step").then((next) => {
          const frame = next?.frames[0];
          if (frame) void openFileAt(frame.file, frame.line, 1);
        });
      },
      stepOutDebugging: () => {
        void stepDebugPython("return").then((next) => {
          const frame = next?.frames[0];
          if (frame) void openFileAt(frame.file, frame.line, 1);
        });
      },
      newExplorerFile: () => {
        if (!rootPath) return;
        const parent =
          activePath && !isVirtualPath(activePath)
            ? parentPath(activePath) ?? rootPath
            : rootPath;
        setSidebarMode("explorer");
        setSidebarOpen(true);
        void createEntry(parent, "file");
      },
      newExplorerFolder: () => {
        if (!rootPath) return;
        const parent =
          activePath && !isVirtualPath(activePath)
            ? parentPath(activePath) ?? rootPath
            : rootPath;
        setSidebarMode("explorer");
        setSidebarOpen(true);
        void createEntry(parent, "directory");
      },
      toggleLineEnding: () => {
        if (!document) return;
        const isCrlf = document.value.includes("\r\n");
        setEol(isCrlf ? "lf" : "crlf");
      },
      continueDebugging: () => {
        setSidebarMode("debug");
        setSidebarOpen(true);
        void stepDebugPython("continue").then((next) => {
          const frame = next?.frames[0];
          if (frame) void openFileAt(frame.file, frame.line, 1);
        });
      },
      toggleDebugPause: () => {
        setSidebarMode("debug");
        setSidebarOpen(true);
        if (debugPythonStop?.event === "stopped") {
          void stepDebugPython("continue").then((next) => {
            const frame = next?.frames[0];
            if (frame) void openFileAt(frame.file, frame.line, 1);
          });
          return;
        }
        notify(
          "Debug",
          debugSessions.some((session) => session.running)
            ? "Pause is only available while stopped at a breakpoint; set one to break into the running program."
            : "No debug session is running.",
        );
      },
      toggleBreakpointCurrentLine: () => {
        if (!activePath || isVirtualPath(activePath)) return;
        const line = document?.cursorLine ?? 1;
        const existing = debugBreakpoints.find(
          (bp) => bp.path === activePath && bp.line === line,
        );
        if (existing) {
          removeBreakpoint(existing.id);
        } else {
          addBreakpoint(activePath, line);
        }
        setSidebarMode("debug");
        setSidebarOpen(true);
      },
      openDocumentation: () => {
        void openUrl("https://github.com/tomlin7/T3D#readme").catch(() => {
          /* ignore if opener unavailable outside Tauri */
        });
      },
      toggleChromeAcrylic: () => {
        updateChromeAcrylic(!settings.chromeAcrylic);
      },
      openReleaseNotes: () => {
        void openUrl("https://github.com/tomlin7/T3D/releases").catch(() => {
          /* ignore */
        });
      },
      showAbout: () => {
        void getVersion()
          .then((version) => {
            notify(
              "About T3D",
              `T3D ${version} — Tauri 2 + React + Monaco. Successor architecture to Biscuit.`,
            );
          })
          .catch(() => {
            notify(
              "About T3D",
              "T3D — Tauri 2 + React + Monaco. Successor architecture to Biscuit.",
            );
          });
      },
      reportIssue: () => {
        void openUrl(
          "https://github.com/tomlin7/T3D/issues/new?labels=bug&template=bug_report.md",
        ).catch(() => {
          /* ignore */
        });
      },
      requestFeature: () => {
        void openUrl(
          "https://github.com/tomlin7/T3D/issues/new?labels=enhancement&template=feature_request.md",
        ).catch(() => {
          /* ignore */
        });
      },
      viewLicense: () => {
        void openUrl("https://github.com/tomlin7/T3D/blob/main/LICENSE").catch(() => {
          /* ignore */
        });
      },
      openCodeOfConduct: () => {
        void openUrl(
          "https://github.com/tomlin7/T3D/blob/main/CODE_OF_CONDUCT.md",
        ).catch(() => {
          /* ignore */
        });
      },
      renameExplorerEntry: () => {
        if (!activePath || isVirtualPath(activePath)) return;
        setSidebarMode("explorer");
        setSidebarOpen(true);
        void renameEntry(activePath);
      },
      deleteExplorerEntry: () => {
        if (!activePath || isVirtualPath(activePath)) return;
        setSidebarMode("explorer");
        setSidebarOpen(true);
        void deleteEntry(activePath);
      },
      toggleAlwaysOnTop: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        const win = getCurrentWindow();
        void win.isAlwaysOnTop().then((onTop) => {
          void win.setAlwaysOnTop(!onTop);
        });
      },
      toggleFullScreen: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          return;
        }
        const win = getCurrentWindow();
        void win.isFullscreen().then((full) => {
          void win.setFullscreen(!full);
        });
      },
      reloadWindow: () => {
        window.location.reload();
      },
      scaffoldExtension: () => {
        setSidebarMode("extensions");
        setSidebarOpen(true);
        void scaffoldInFolder();
      },
      installExtensionFromFolder: () => {
        setSidebarMode("extensions");
        setSidebarOpen(true);
        void installFromFolder();
      },
      installSampleExtension: () => {
        setSidebarMode("extensions");
        setSidebarOpen(true);
        void installSample();
      },
      reloadExtensions: async () => {
        extensionHost.restart();
        const list = await reloadExtensions();
        notify(
          "Extensions",
          list
            ? `Reloaded ${list.length} extension${list.length === 1 ? "" : "s"} from disk.`
            : "Could not reload extensions; see the Extensions view for details.",
        );
      },
      clearAllBreakpoints: () => {
        clearBreakpoints();
        setSidebarMode("debug");
        setSidebarOpen(true);
      },
      disableAllBreakpoints: () => {
        setAllBreakpointsEnabled(false);
        setSidebarMode("debug");
        setSidebarOpen(true);
      },
      enableAllBreakpoints: () => {
        setAllBreakpointsEnabled(true);
        setSidebarMode("debug");
        setSidebarOpen(true);
      },
      showFileEncoding: () => {
        if (!document || isVirtualPath(document.path)) {
          notify("Encoding", "UTF-8");
          return;
        }
        void editorConfigFor(document.path, rootPath).then((config) => {
          const charset = config.charset?.trim();
          notify("Encoding", charset ? charset.toUpperCase() : "UTF-8");
        });
      },
      openRecentFolder: () => {
        const folders = recentFolders();
        if (folders.length === 0) {
          notify("Recent folders", "No recent folders yet.");
          return;
        }
        void openFolderAt(folders[0]);
      },
      openRecentFile: () => {
        const files = recentFiles();
        if (files.length === 0) {
          notify("Recent files", "No recent files yet.");
          return;
        }
        void openFile(files[0]);
      },
      copyFileEncoding: () => {
        if (!document || isVirtualPath(document.path)) {
          void navigator.clipboard.writeText("UTF-8");
          notify("Encoding", "Copied UTF-8");
          return;
        }
        void editorConfigFor(document.path, rootPath).then((config) => {
          const charset = (config.charset?.trim() || "utf-8").toUpperCase();
          void navigator.clipboard.writeText(charset);
          notify("Encoding", `Copied ${charset}`);
        });
      },
      openExtensionsMarketplace: () => {
        void openUrl(
          "https://github.com/search?q=topic%3At3d-extension&type=repositories",
        ).catch(() => {
          /* ignore */
        });
      },
      toggleZenMode: () => {
        if (zenRestoreRef.current) {
          const restore = zenRestoreRef.current;
          zenRestoreRef.current = null;
          setSidebarOpen(restore.sidebarOpen);
          setAiOpen(restore.aiOpen);
          setBottomOpen(restore.bottomOpen);
          return;
        }
        zenRestoreRef.current = { sidebarOpen, aiOpen, bottomOpen };
        setSidebarOpen(false);
        setAiOpen(false);
        setBottomOpen(false);
      },
      cycleLanguageMode: () => {
        if (!document) return;
        const langs = PICKABLE_LANGUAGES as readonly string[];
        const idx = langs.indexOf(document.language);
        const next = langs[(idx >= 0 ? idx + 1 : 0) % langs.length];
        setLanguageAt(document.path, next);
        notify("Language Mode", languageLabel(next));
      },
      openNextEditor: () => {
        if (tabs.length < 2) return;
        const idx = activePath
          ? tabs.findIndex((tab) => tab.path === activePath)
          : -1;
        const next = tabs[((idx >= 0 ? idx : 0) + 1) % tabs.length];
        if (next) activateTab(next.path);
      },
      openPreviousEditor: () => {
        if (tabs.length < 2) return;
        const idx = activePath
          ? tabs.findIndex((tab) => tab.path === activePath)
          : 0;
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        if (prev) activateTab(prev.path);
      },
      toggleAutoSave: () => {
        const next = settings.editor.autoSaveMs > 0 ? 0 : 1000;
        updateEditor({ autoSaveMs: next });
        notify("Auto Save", next > 0 ? `On (${next} ms)` : "Off");
      },
      searchGoogle: () => {
        const selected = selectionText.trim();
        const query =
          selected ||
          window.prompt("Search Google for:")?.trim() ||
          "";
        if (!query) return;
        void openUrl(
          `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        ).catch(() => {
          /* ignore */
        });
      },
      toggleBlockCursor: () => {
        const next =
          settings.editor.cursorStyle === "block" ? "line" : "block";
        updateEditor({ cursorStyle: next });
        notify("Cursor", next === "block" ? "Block cursor" : "Line cursor");
      },
      showActiveEditors: () => {
        if (tabs.length === 0) {
          notify("Open Editors", "No editors are open.");
          return;
        }
        setRecentCommands([]);
        setSymbolCommands(
          tabs.map((tab) => ({
            id: `active-editor:${tab.path}`,
            title: `Open Editors — ${tab.title}${tab.pinned ? " (pinned)" : ""}`,
            category: "Open Editors",
            run: () => activateTab(tab.path),
          })),
        );
        setPaletteSeed("Open Editors");
        setPaletteOpen(true);
      },
      changeIndentationLevel: () => {
        setRecentCommands([]);
        setSymbolCommands(
          [2, 4, 8].map((size) => ({
            id: `indent:${size}`,
            title: `Indent Using Spaces: ${size}`,
            category: "Indentation",
            run: () => {
              updateEditor({ tabSize: size });
              notify("Indentation", `${size} spaces`);
            },
          })),
        );
        setPaletteSeed("Indent");
        setPaletteOpen(true);
      },
      openNewWindow: () => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
          notify("New Window", "Available only in the desktop app.");
          return;
        }
        const label = `t3d-${Date.now()}`;
        const created = new WebviewWindow(label, {
          url: "index.html",
          title: "T3D",
          width: 1280,
          height: 800,
          minWidth: 800,
          minHeight: 500,
          decorations: false,
          transparent: true,
          resizable: true,
        });
        void created.once("tauri://error", (event) => {
          notify("New Window", String(event.payload ?? "Failed to open window"));
        });
      },
      toggleSecondarySidebar: () => {
        toggleAi();
      },
      configureRunCommand: () => {
        const language =
          document?.language && document.language !== "plaintext"
            ? document.language
            : window.prompt(
                "Language id (e.g. python, javascript):",
                document?.language ?? "python",
              )?.trim() || "";
        if (!language) return;
        const current = readRunCommands()[language] ?? "";
        const next = window.prompt(
          `Run command for ${language} (use {file} for the path; empty clears):`,
          current || `python {file}`,
        );
        if (next == null) return;
        setRunCommand(language, next);
        notify(
          "Run Command",
          next.trim()
            ? `Saved for ${languageLabel(language)}`
            : `Cleared for ${languageLabel(language)}`,
        );
      },
      showRunConfigurations: () => {
        const saved = Object.entries(readRunCommands()).sort(([a], [b]) => a.localeCompare(b));
        setRecentCommands([]);
        setSymbolCommands([
          ...saved.map(([language, template]) => ({
            id: `runConfig:${language}`,
            title: `Run Configuration: ${languageLabel(language)} — ${template}`,
            category: "Run Configuration",
            run: () => {
              const next = window.prompt(
                `Run command for ${language} (use {file} for the path; empty clears):`,
                template,
              );
              if (next == null) return;
              setRunCommand(language, next);
              notify(
                "Run Command",
                next.trim()
                  ? `Saved for ${languageLabel(language)}`
                  : `Cleared for ${languageLabel(language)}`,
              );
            },
          })),
          {
            id: "runConfig:add",
            title: saved.length
              ? "Run Configuration: Add Run Command…"
              : "Run Configuration: None saved yet — Add Run Command…",
            category: "Run Configuration",
            run: (ctx) => ctx.configureRunCommand(),
          },
        ]);
        setPaletteSeed("Run Configuration");
        setPaletteOpen(true);
      },
      toggleVimMode: () => {
        const next = !settings.vimMode;
        updateApp({ vimMode: next });
        if (next) updateEditor({ cursorStyle: "block" });
        notify(
          "Vim Mode",
          next
            ? "monaco-vim bindings on (status line under the editor)."
            : "Off",
        );
      },
      changeEncoding: () => {
        const encodings = [
          "UTF-8",
          "UTF-16LE",
          "UTF-16BE",
          "ISO-8859-1",
          "WINDOWS-1252",
        ];
        setRecentCommands([]);
        setSymbolCommands(
          encodings.map((enc) => ({
            id: `encoding:${enc}`,
            title: `Encoding: ${enc}`,
            category: "Encoding",
            run: () => {
              updateApp({ preferredEncoding: enc });
              notify("Encoding", enc);
            },
          })),
        );
        setPaletteSeed("Encoding");
        setPaletteOpen(true);
      },
      searchGitHubIssues: () => {
        void resolveGithubRepoUrl().then((web) => {
          if (!web) return;
          const q = selectionText.trim() || window.prompt("Search issues for:")?.trim() || "";
          void openUrl(githubIssuesSearchUrl(web, q)).catch(() => {
            /* ignore */
          });
        });
      },
      searchGitHubPullRequests: () => {
        void resolveGithubRepoUrl().then((web) => {
          if (!web) return;
          const q = selectionText.trim() || window.prompt("Search pull requests for:")?.trim() || "";
          void openUrl(githubPullsSearchUrl(web, q)).catch(() => {
            /* ignore */
          });
        });
      },
      openRepositoryOnGitHub: () => {
        void resolveGithubRepoUrl().then((web) => {
          if (!web) return;
          void openUrl(web).catch(() => {
            /* ignore */
          });
        });
      },
      goToNextProblem: () => {
        refreshDiagnosticsMarkers();
        const list = [...problems].sort((a, b) => {
          const byPath = a.path.localeCompare(b.path);
          if (byPath !== 0) return byPath;
          if (a.line !== b.line) return a.line - b.line;
          return a.column - b.column;
        });
        if (list.length === 0) {
          notify("Problems", "No problems in open editors.");
          return;
        }
        openProblems();
        const curPath = activePath ?? "";
        const curLine = document?.cursorLine ?? 1;
        const curCol = document?.cursorColumn ?? 1;
        let idx = list.findIndex(
          (p) =>
            p.path === curPath &&
            (p.line > curLine || (p.line === curLine && p.column > curCol)),
        );
        if (idx < 0) {
          idx = list.findIndex((p) => p.path.localeCompare(curPath) > 0);
        }
        if (idx < 0) idx = 0;
        const next = list[idx];
        void openFileAt(next.path, next.line, next.column);
      },
      goToPreviousProblem: () => {
        refreshDiagnosticsMarkers();
        const list = [...problems].sort((a, b) => {
          const byPath = a.path.localeCompare(b.path);
          if (byPath !== 0) return byPath;
          if (a.line !== b.line) return a.line - b.line;
          return a.column - b.column;
        });
        if (list.length === 0) {
          notify("Problems", "No problems in open editors.");
          return;
        }
        openProblems();
        const curPath = activePath ?? "";
        const curLine = document?.cursorLine ?? 1;
        const curCol = document?.cursorColumn ?? 1;
        let idx = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          if (
            p.path === curPath &&
            (p.line < curLine || (p.line === curLine && p.column < curCol))
          ) {
            idx = i;
            break;
          }
          if (p.path.localeCompare(curPath) < 0) {
            idx = i;
            break;
          }
        }
        if (idx < 0) idx = list.length - 1;
        const prev = list[idx];
        void openFileAt(prev.path, prev.line, prev.column);
      },
      revertActiveFile: () => {
        void (async () => {
          if (!activePath || isVirtualPath(activePath)) {
            notify("Revert File", "Open a saved file first.");
            return;
          }
          const tab = tabs.find((item) => item.path === activePath);
          if (!tab || tab.language === "image") {
            notify("Revert File", "Nothing to revert.");
            return;
          }
          if (tab.value !== tab.baseline) {
            const ok = window.confirm(
              `Revert ${tab.title}? Unsaved changes will be lost.`,
            );
            if (!ok) return;
          }
          try {
            const text = await readTextFile(activePath);
            applyDiskValue(activePath, text);
            notify("Revert File", `Reloaded ${tab.title}`);
          } catch (err) {
            notify(
              "Revert File",
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
      },
      copyActiveFileName: () => {
        if (!activePath) return;
        void navigator.clipboard.writeText(basename(activePath));
        notify("Copied", basename(activePath));
      },
      openNextGitChangedFile: () => {
        void (async () => {
          if (!rootPath) {
            notify("Git", "Open a folder first.");
            return;
          }
          try {
            const summary = await invoke<GitSummary>("git_summary", {
              cwd: rootPath,
            });
            const paths = (summary.entries ?? []).map((entry) =>
              joinPath(rootPath, entry.path),
            );
            if (paths.length === 0) {
              notify("Git", "No changed files.");
              return;
            }
            const key = (activePath ?? "").replace(/\\/g, "/").toLowerCase();
            const idx = paths.findIndex(
              (path) => path.replace(/\\/g, "/").toLowerCase() === key,
            );
            const next = paths[(idx + 1) % paths.length];
            await openFile(next);
            setSidebarMode("scm");
            setSidebarOpen(true);
          } catch (err) {
            notify(
              "Git",
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
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
      closeEditorsToTheRight,
      closeEditorsToTheLeft,
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
      settings.editor.fontFamily,
      updateEditor,
      clearAttachments,
      clearChat,
      exportSession,
      importSession,
      newChat,
      setSettings,
      aiSettings.maxToolRounds,
      aiSettings.requestTimeoutSec,
      aiSettings.stopOnToolError,
      aiSettings.temperature,
      aiSettings.topP,
      aiSettings.maxTokens,
      aiSettings.presencePenalty,
      aiSettings.frequencyPenalty,
      showHistory,
      setShowHistory,
      setAiOpen,
      setSidebarMode,
      openSettings,
      setSidebarOpen,
      cycleEffort,
      stop,
      regenerate,
      attachPath,
      attachFiles,
      deleteSession,
      activeSessionId,
      messages,
      aiSettings.model,
      aiSettings.seed,
      gitAhead,
      gitBehind,
      notify,
      setAiWidth,
      problems,
      refreshDiagnosticsMarkers,
      gitBranch,
      gitDirtyCount,
      clearNotificationsList,
      markNotificationsReadList,
      dismissNotification,
      notificationItems,
      notificationUnread,
      resetEditorSettings,
      sidebarWidth,
      aiWidth,
      bottomHeight,
      setSidebarWidth,
      setBottomHeight,
      bottomOpen,
      panelTab,
      setPanelTab,
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
      debugSessions,
      restoreRecentSession,
      openWebviewTab,
      startDebugSession,
      stopDebugSession,
      stepDebugPython,
      debugPythonStop,
      createEntry,
      setEol,
      document,
      debugBreakpoints,
      addBreakpoint,
      removeBreakpoint,
      openFileAt,
      rootPath,
      updateChromeAcrylic,
      settings.chromeAcrylic,
      renameEntry,
      deleteEntry,
      scaffoldInFolder,
      installFromFolder,
      installSample,
      reloadExtensions,
      clearBreakpoints,
      setAllBreakpointsEnabled,
      setLanguageAt,
      sidebarOpen,
      aiOpen,
      activateTab,
      selectionText,
      toggleAi,
      updateApp,
      settings.vimMode,
      resolveGithubRepoUrl,
      applyDiskValue,
      problems,
      refreshDiagnosticsMarkers,
      openProblems,
      document,
    ],
  );
  const commandContextRef = useRef(commandContext);
  commandContextRef.current = commandContext;

  const workspaceSnapshotRef = useRef<WorkspaceSnapshot>({ rootPath: null, roots: [], activeDocument: null });
  workspaceSnapshotRef.current = {
    rootPath,
    roots,
    activeDocument: document
      ? {
          path: document.path,
          title: document.title,
          language: document.language,
          selectionText,
          isUntitled: isVirtualPath(document.path),
        }
      : null,
  };

  useEffect(() => {
    extensionHost.setServices({
      showMessage: (_level, message, extensionName) => notify(extensionName, message),
      showInputBox: async (options) => {
        const value = window.prompt(options.prompt ?? options.placeHolder ?? "", options.value ?? "");
        return value ?? undefined;
      },
      showQuickPick: (items, options) =>
        new Promise<string | undefined>((resolve) => {
          quickPickResolverRef.current?.(undefined);
          quickPickResolverRef.current = resolve;
          const prefix = `${options.placeHolder?.trim() || "Pick"}:`;
          setRecentCommands([]);
          setSymbolCommands(
            items.map((item, index) => ({
              id: `t3d.quickPick:${index}`,
              title: `${prefix} ${item}`,
              category: "Extension",
              run: () => resolve(item),
            })),
          );
          setPaletteSeed(prefix);
          setPaletteOpen(true);
        }),
      executeCoreCommand: async (command) => {
        const target = COMMANDS.find((item) => item.id === command);
        if (!target) throw new Error(`Unknown command ${command}`);
        await target.run(commandContextRef.current);
        return null;
      },
      openExternal: (url) => openUrl(url),
      writeClipboard: (text) => navigator.clipboard.writeText(text),
      getWorkspaceState: () => workspaceSnapshotRef.current,
    });
  }, [notify]);

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

      if (mod && key === "q" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        commandContextRef.current.quit();
        clearChord();
        return;
      }

      if (mod && event.shiftKey && event.code === "Digit5") {
        event.preventDefault();
        setPanelTab("terminal");
        setBottomOpen(true);
        requestSplitTerminal();
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
    setPanelTab,
    setBottomOpen,
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
        sidebarOpen={sidebarOpen}
        sidebarMode={sidebarMode}
        onOpenSettings={openSettings}
        onToggleSidebarMode={(mode) => {
          if (sidebarOpen && sidebarMode === mode) {
            setSidebarOpen(false);
          } else {
            setSidebarMode(mode);
            setSidebarOpen(true);
          }
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
            onClose={() => setBottomOpen(false)}
            isMaximized={bottomHeight >= 420}
            onToggleMaximize={() => {
              if (bottomHeight >= 420) setBottomHeight(220);
              else setBottomHeight(480);
            }}
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
          <AiPanel onOpenSettings={() => openSettings("ai")} />
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
      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
        initialTab={settingsCategory}
      />
      {toastIds.length > 0 && (
        <div className="app-shell__toasts" role="region" aria-label="Notifications">
          {notificationItems
            .filter((item) => toastIds.includes(item.id))
            .map((item) => (
              <div key={item.id} className="app-shell__toast island">
                <div className="app-shell__toast-content">
                  <strong className="app-shell__toast-title">{item.title}</strong>
                  {item.detail && <p className="app-shell__toast-detail">{item.detail}</p>}
                  {item.action && (
                    <button
                      type="button"
                      className="app-shell__toast-action"
                      onClick={() => {
                        setToastIds((prev) => prev.filter((id) => id !== item.id));
                        item.action?.run();
                      }}
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="app-shell__toast-close"
                  aria-label="Dismiss notification"
                  onClick={() => {
                    setToastIds((prev) => prev.filter((id) => id !== item.id));
                    dismissNotification(item.id);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
        </div>
      )}
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
