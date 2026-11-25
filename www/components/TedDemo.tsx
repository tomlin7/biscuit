"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import {
  FolderTree,
  Search,
  ListTree,
  GitBranch,
  Bug,
  Blocks,
  Folder,
  Plus,
  Play,
  Sparkles,
  Settings,
  Terminal,
  AlertCircle,
  Bell,
  X,
  ChevronRight,
  Minus,
  Square,
  FilePlus,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import "./t3d-demo.css";

/* ─── File tree definition exactly mirroring T3D ─────────────────────────── */
interface TreeNode {
  name: string;
  isDir: boolean;
  children?: TreeNode[];
  status?: "modified" | "new";
}

const T3D_EXPLORER_TREE: TreeNode[] = [
  {
    name: "src",
    isDir: true,
    children: [
      {
        name: "layout",
        isDir: true,
        children: [
          { name: "AppShell.tsx", isDir: false, status: "modified" },
          { name: "TitleBar.tsx", isDir: false },
          { name: "Sidebar.tsx", isDir: false },
          { name: "EditorArea.tsx", isDir: false },
          { name: "BottomPanel.tsx", isDir: false },
          { name: "StatusBar.tsx", isDir: false },
        ],
      },
      {
        name: "editor",
        isDir: true,
        children: [
          { name: "MonacoEditor.tsx", isDir: false },
          { name: "editorconfig.ts", isDir: false },
        ],
      },
      {
        name: "terminal",
        isDir: true,
        children: [
          { name: "TerminalPanel.tsx", isDir: false },
          { name: "runConfig.ts", isDir: false },
        ],
      },
      {
        name: "scm",
        isDir: true,
        children: [
          { name: "ScmPanel.tsx", isDir: false },
          { name: "DiffView.tsx", isDir: false },
        ],
      },
      { name: "App.tsx", isDir: false },
    ],
  },
  {
    name: "src-tauri",
    isDir: true,
    children: [
      { name: "Cargo.toml", isDir: false },
      { name: "tauri.conf.json", isDir: false },
    ],
  },
  { name: "package.json", isDir: false },
  { name: "README.md", isDir: false, status: "new" },
];

/* ─── Real T3D Source Code Buffers ───────────────────────────────────────── */
const T3D_SOURCE_CODE: Record<string, string> = {
  "AppShell.tsx": `import { useCallback, useEffect, useState } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { BottomPanel } from "./BottomPanel";
import { StatusBar } from "./StatusBar";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import "./AppShell.css";

export function AppShell() {
  const workspace = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<"explorer" | "scm">("explorer");
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"terminal" | "problems">("terminal");

  return (
    <div className="app-shell">
      <TitleBar
        sidebarOpen={sidebarOpen}
        sidebarMode={sidebarMode}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="app-shell__workspace">
        {sidebarOpen && (
          <aside className="island sidebar">
            <Sidebar mode={sidebarMode} onModeChange={setSidebarMode} />
          </aside>
        )}
        <div className="app-shell__main">
          <EditorArea />
          {bottomOpen && (
            <BottomPanel
              tab={bottomTab}
              onTabChange={setBottomTab}
              onClose={() => setBottomOpen(false)}
            />
          )}
        </div>
      </div>
      <StatusBar gitBranch="main" gitDirtyCount={1} />
    </div>
  );
}`,
  "TitleBar.tsx": `import { Folder, Plus, Play, Sparkles, Settings } from "lucide-react";
import { IconButton } from "../ui/IconButton";

export function TitleBar({ rootName = "biscuit/T3D" }) {
  return (
    <header className="titlebar">
      <div className="titlebar__left">
        {/* Island mode buttons: Explorer, Search, Outline, SCM, Debug, Extensions */}
      </div>
      <button className="titlebar__project">
        <Folder size={14} className="text-[#3b82f6]" />
        <span className="titlebar__project-name">{rootName}</span>
        <Plus size={14} />
      </button>
      <div className="titlebar__actions">
        <IconButton icon={Play} label="Run" />
        <IconButton icon={Sparkles} label="Toggle AI" />
        <IconButton icon={Settings} label="Settings" />
      </div>
    </header>
  );
}`,
  "TerminalPanel.tsx": `import { Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";

export function TerminalPanel() {
  // Native Rust PTY backed by portable-pty
  return <div className="terminal-panel terminal-panel--embedded" />;
}`,
  "Cargo.toml": `[package]
name = "t3d"
version = "0.467.0"
description = "T3D - modern code editor (Tauri 2)"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
portable-pty = "0.9.0"
serde = { version = "1", features = ["derive"] }
`,
  "README.md": `# T3D

Modern code editor built with Tauri 2, React 19, and Monaco.
Successor architecture to Biscuit — same spirit, cleaner structure.
`,
};

/* ─── File badges matching T3D FileIcon ──────────────────────────────────── */
function FileBadge({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === "Cargo.toml") return <span className="t3d-file-badge t3d-file-badge--toml">TM</span>;
  if (name === "package.json" || name === "tauri.conf.json")
    return <span className="t3d-file-badge t3d-file-badge--json">&#123;&#125;</span>;
  if (name === "README.md") return <span className="t3d-file-badge t3d-file-badge--md">MD</span>;
  if (ext === "tsx") return <span className="t3d-file-badge t3d-file-badge--ts">TX</span>;
  if (ext === "ts") return <span className="t3d-file-badge t3d-file-badge--ts">TS</span>;
  return <span className="t3d-file-badge t3d-file-badge--ts">&bull;</span>;
}

const EDITOR_SETUP = {
  lineNumbers: true,
  highlightActiveLine: true,
  foldGutter: false,
  dropCursor: false,
  autocompletion: false,
};

const EDITOR_THEME = [
  vscodeDark,
  EditorView.theme({
    "&": {
      backgroundColor: "#141414 !important",
      height: "100%",
      fontSize: "13px",
      padding: "0",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      lineHeight: "22px",
      padding: "0",
    },
    ".cm-line": { padding: "0 0 0 10px" },
    ".cm-gutters": {
      backgroundColor: "#141414 !important",
      borderRight: "none",
      color: "#5c5c5c",
      fontSize: "12px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.03) !important" },
    ".cm-selectionBackground": { backgroundColor: "rgba(59, 130, 246, 0.22) !important" },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "44px", padding: "0 12px 0 6px" },
  }),
];

export default function TedDemo() {
  const [openTabs, setOpenTabs] = useState<string[]>(["AppShell.tsx", "TitleBar.tsx"]);
  const [activeTab, setActiveTab] = useState<string>("AppShell.tsx");
  const [sidebarMode, setSidebarMode] = useState<
    "explorer" | "search" | "outline" | "scm" | "debug" | "extensions"
  >("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"terminal" | "problems" | "logs">("terminal");

  const [fileContents, setFileContents] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(T3D_SOURCE_CODE))
  );

  const handleFileClick = useCallback((name: string) => {
    if (!T3D_SOURCE_CODE[name]) return;
    setOpenTabs((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setActiveTab(name);
  }, []);

  const closeTab = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== filename);
    setOpenTabs(newTabs);
    if (activeTab === filename) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : "");
    }
  };

  const docExtensions = useMemo(() => [javascript({ jsx: true, typescript: true })], []);

  const onCodeChange = useCallback(
    (val: string) => {
      if (!activeTab) return;
      setFileContents((prev) => ({ ...prev, [activeTab]: val }));
    },
    [activeTab]
  );

  return (
    <div className="relative w-full aspect-[16/10.5] overflow-hidden t3d-app-shell rounded-lg border border-[#222]">
      {/* ── 1. TitleBar (Exact T3D layout) ─────────────────────────────────── */}
      <header className="t3d-titlebar">
        {/* Left: Mode icon buttons */}
        <div className="t3d-titlebar__left">
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "explorer") setSidebarOpen(false);
              else {
                setSidebarMode("explorer");
                setSidebarOpen(true);
              }
            }}
            title="Explorer"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "explorer" ? "t3d-icon-btn--active" : ""}`}
          >
            <FolderTree size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "search") setSidebarOpen(false);
              else {
                setSidebarMode("search");
                setSidebarOpen(true);
              }
            }}
            title="Search files"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "search" ? "t3d-icon-btn--active" : ""}`}
          >
            <Search size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "outline") setSidebarOpen(false);
              else {
                setSidebarMode("outline");
                setSidebarOpen(true);
              }
            }}
            title="Outline"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "outline" ? "t3d-icon-btn--active" : ""}`}
          >
            <ListTree size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "scm") setSidebarOpen(false);
              else {
                setSidebarMode("scm");
                setSidebarOpen(true);
              }
            }}
            title="Source Control"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "scm" ? "t3d-icon-btn--active" : ""}`}
          >
            <GitBranch size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "debug") setSidebarOpen(false);
              else {
                setSidebarMode("debug");
                setSidebarOpen(true);
              }
            }}
            title="Run and Debug"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "debug" ? "t3d-icon-btn--active" : ""}`}
          >
            <Bug size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (sidebarOpen && sidebarMode === "extensions") setSidebarOpen(false);
              else {
                setSidebarMode("extensions");
                setSidebarOpen(true);
              }
            }}
            title="Extensions"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "extensions" ? "t3d-icon-btn--active" : ""}`}
          >
            <Blocks size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Center: Project Root Capsule */}
        <button type="button" className="t3d-titlebar__project" title="biscuit/T3D">
          <Folder size={14} strokeWidth={1.75} className="text-[#3b82f6] shrink-0" />
          <span className="truncate">biscuit/T3D</span>
          <Plus size={14} strokeWidth={1.75} className="text-[#8a8a8a] shrink-0" />
        </button>

        {/* Right: Actions & Window controls */}
        <div className="t3d-titlebar__actions">
          <button type="button" className="t3d-icon-btn" title="Run current file">
            <Play size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="t3d-icon-btn" title="Toggle AI">
            <Sparkles size={14} strokeWidth={1.75} className="text-amber-400" />
          </button>
          <button type="button" className="t3d-icon-btn" title="Settings">
            <Settings size={14} strokeWidth={1.75} />
          </button>

          {/* Window controls */}
          <div className="t3d-titlebar__window-controls">
            <button type="button" className="t3d-titlebar__window-btn" title="Minimize">
              <Minus size={13} strokeWidth={1.75} />
            </button>
            <button type="button" className="t3d-titlebar__window-btn" title="Maximize">
              <Square size={11} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="t3d-titlebar__window-btn t3d-titlebar__window-btn--close"
              title="Close"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Workspace Islands ───────────────────────────────────────────── */}
      <div className="t3d-workspace">
        {/* Island: Sidebar */}
        {sidebarOpen && (
          <aside className="t3d-island t3d-sidebar">
            {/* Filter input */}
            <div className="t3d-sidebar__search">
              <Search size={14} className="text-[#5c5c5c] shrink-0" />
              <input type="text" placeholder="Filter" readOnly />
            </div>

            {/* Explorer Toolbar */}
            <div className="t3d-file-tree__toolbar">
              <span className="t3d-file-tree__title">WORKSPACE</span>
              <div className="flex items-center gap-1.5 text-[#5c5c5c]">
                <FilePlus size={13} className="hover:text-white cursor-pointer" />
                <FolderPlus size={13} className="hover:text-white cursor-pointer" />
                <RefreshCw size={12} className="hover:text-white cursor-pointer" />
              </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-1.5">
              <TreeBranch
                nodes={T3D_EXPLORER_TREE}
                depth={0}
                activeTab={activeTab}
                onFileClick={handleFileClick}
              />
            </div>
          </aside>
        )}

        {/* Island: Main Editor + Bottom Panel */}
        <main className="flex-1 flex flex-col gap-[var(--gap-shell)] min-w-0 min-h-0">
          {/* Top Island: Editor Area */}
          <div className="t3d-island flex-1">
            {/* Tab strip */}
            <div className="t3d-editor-tabs" role="tablist">
              {openTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`t3d-editor-tab ${isActive ? "t3d-editor-tab--active" : ""}`}
                  >
                    <FileBadge name={tab} />
                    <span className="truncate">{tab}</span>
                    <span
                      onClick={(e) => closeTab(e, tab)}
                      className="size-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/10 ml-1"
                    >
                      <X size={11} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Breadcrumb row */}
            <div className="t3d-editor-area__crumbs">
              <span>src</span>
              <span className="text-[#5c5c5c]">/</span>
              <span className="text-[#e8e8e8]">{activeTab}</span>
            </div>

            {/* Code Surface */}
            <div className="flex-1 relative overflow-hidden bg-[#141414]">
              {activeTab ? (
                <div className="h-full relative isolate overflow-hidden">
                  <CodeMirror
                    value={fileContents[activeTab] || ""}
                    height="100%"
                    theme={EDITOR_THEME}
                    extensions={docExtensions}
                    onChange={onCodeChange}
                    basicSetup={EDITOR_SETUP}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8a8a8a]">
                  No editor open
                </div>
              )}
            </div>
          </div>

          {/* Bottom Island: Panel (Terminal / Problems / Logs) */}
          {bottomOpen && (
            <div className="t3d-island t3d-bottom-panel">
              {/* Header */}
              <div className="t3d-bottom-panel__header">
                <div className="t3d-bottom-panel__tabs">
                  <button
                    type="button"
                    onClick={() => setBottomTab("terminal")}
                    className={`t3d-bottom-panel__tab ${
                      bottomTab === "terminal" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomTab("problems")}
                    className={`t3d-bottom-panel__tab ${
                      bottomTab === "problems" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Problems
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomTab("logs")}
                    className={`t3d-bottom-panel__tab ${
                      bottomTab === "logs" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Logs
                  </button>
                </div>

                <div className="t3d-bottom-panel__actions">
                  <button
                    type="button"
                    onClick={() => setBottomOpen(false)}
                    className="t3d-icon-btn"
                    title="Close Panel"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* View */}
              {bottomTab === "terminal" && (
                <div className="flex-1 p-3 font-mono text-[11.5px] bg-[#141414] text-[#8a8a8a] flex flex-col">
                  <div className="text-[#3b82f6] font-semibold">
                    PS E:\biscuit\T3D&gt; bun run tauri dev
                  </div>
                  <div className="text-[#d4d4d4] mt-1">
                    $ tauri dev
                  </div>
                  <div className="text-[#73c991] mt-0.5">
                    &bull; Watching E:\biscuit\T3D\src-tauri for Rust changes...
                  </div>
                </div>
              )}

              {bottomTab === "problems" && (
                <div className="flex-1 p-3 flex items-center justify-center text-xs text-[#5c5c5c]">
                  No problems have been detected in the workspace.
                </div>
              )}

              {bottomTab === "logs" && (
                <div className="flex-1 p-3 font-mono text-xs text-[#8a8a8a]">
                  [info] t3d v0.467.0 initialized
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── 3. StatusBar (Exact T3D layout) ─────────────────────────────────── */}
      <footer className="t3d-status-bar border-t border-[#1f1f1f]">
        <div className="t3d-status-bar__group">
          <button
            type="button"
            className="t3d-status-bar__chip"
            title="Source Control"
            onClick={() => {
              setSidebarMode("scm");
              setSidebarOpen(true);
            }}
          >
            <GitBranch size={13} className="text-[#3b82f6]" />
            <span>main</span>
            <span className="t3d-status-bar__sync">●1</span>
          </button>

          <button
            type="button"
            className="t3d-status-bar__chip"
            title="Workspace folder"
          >
            <Folder size={13} className="text-[#60a5fa]" />
            <span>biscuit/T3D</span>
          </button>

          <button
            type="button"
            className="t3d-icon-btn"
            title="Toggle Terminal"
            onClick={() => setBottomOpen((v) => !v)}
          >
            <Terminal size={13} />
          </button>

          <button
            type="button"
            className="t3d-status-bar__chip"
            title="Problems"
            onClick={() => {
              setBottomTab("problems");
              setBottomOpen(true);
            }}
          >
            <AlertCircle size={13} className="text-[#73c991]" />
            <span>0</span>
          </button>
        </div>

        <div className="t3d-status-bar__group">
          <span className="t3d-status-bar__item">Ln 14, Col 28</span>
          <span className="t3d-status-bar__item">Spaces: 2</span>
          <span className="t3d-status-bar__item">UTF-8</span>
          <span className="t3d-status-bar__item text-[#e8e8e8]">TypeScript JSX</span>
          <button type="button" className="t3d-icon-btn" title="Notifications">
            <Bell size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ─── Tree branch renderer with indent levels ────────────────────────────── */
const TreeBranch = memo(
  ({
    nodes,
    depth,
    activeTab,
    onFileClick,
  }: {
    nodes: TreeNode[];
    depth: number;
    activeTab: string;
    onFileClick: (n: string) => void;
  }) => {
    return (
      <>
        {nodes.map((node) => (
          <TreeRow
            key={node.name}
            node={node}
            depth={depth}
            activeTab={activeTab}
            onFileClick={onFileClick}
          />
        ))}
      </>
    );
  }
);
TreeBranch.displayName = "TreeBranch";

const TreeRow = memo(
  ({
    node,
    depth,
    activeTab,
    onFileClick,
  }: {
    node: TreeNode;
    depth: number;
    activeTab: string;
    onFileClick: (n: string) => void;
  }) => {
    const [open, setOpen] = useState(true);
    const isActive = activeTab === node.name;
    const paddingLeft = 4 + depth * 12;

    return (
      <>
        <button
          type="button"
          onClick={() => (node.isDir ? setOpen(!open) : onFileClick(node.name))}
          className={`t3d-file-tree__row ${isActive ? "t3d-file-tree__row--active" : ""}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {node.isDir ? (
            <div className="w-3.5 flex items-center justify-center shrink-0 text-[#5c5c5c]">
              <ChevronRight
                size={12}
                className={`transition-transform ${open ? "rotate-90 text-[#8a8a8a]" : ""}`}
              />
            </div>
          ) : (
            <div className="w-3.5 flex items-center justify-center shrink-0">
              <FileBadge name={node.name} />
            </div>
          )}

          <span className="truncate flex-1">{node.name}</span>

          {node.status === "modified" && (
            <span className="text-[10px] text-amber-400 font-bold shrink-0">M</span>
          )}
          {node.status === "new" && (
            <span className="text-[10px] text-emerald-400 font-bold shrink-0">U</span>
          )}
        </button>

        {node.isDir && open && node.children && (
          <TreeBranch
            nodes={node.children}
            depth={depth + 1}
            activeTab={activeTab}
            onFileClick={onFileClick}
          />
        )}
      </>
    );
  }
);
TreeRow.displayName = "TreeRow";
