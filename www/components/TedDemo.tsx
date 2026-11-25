"use client";

import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
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
  Columns2,
  Table,
  Binary,
  CheckCircle2,
  Info,
  TerminalSquare,
  Command,
  FileText,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import "./t3d-demo.css";

/* ─── File tree definition mirroring Morsel / T3D ────────────────────────── */
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
        ],
      },
      {
        name: "rust",
        isDir: true,
        children: [{ name: "pty.rs", isDir: false }],
      },
      {
        name: "data",
        isDir: true,
        children: [
          { name: "benchmarks.csv", isDir: false },
          { name: "firmware.hex", isDir: false },
        ],
      },
    ],
  },
  {
    name: "docs",
    isDir: true,
    children: [{ name: "architecture.pdf", isDir: false }],
  },
  {
    name: "src-tauri",
    isDir: true,
    children: [
      { name: "Cargo.toml", isDir: false },
      { name: "tauri.conf.json", isDir: false },
    ],
  },
  { name: "morsel.config.json", isDir: false },
  { name: "README.md", isDir: false, status: "new" },
];

/* ─── Real Source Buffers ────────────────────────────────────────────────── */
const T3D_SOURCE_CODE: Record<string, string> = {
  "AppShell.tsx": `import { useCallback, useState } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { EditorGrid } from "./EditorGrid";
import { BottomPanel } from "./BottomPanel";
import { StatusBar } from "./StatusBar";
import { useWorkspace } from "../workspace/WorkspaceContext";

export function AppShell() {
  const { isSplitView, activeTab } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"terminal" | "problems" | "logs">("terminal");

  return (
    <div className="morsel-shell">
      <TitleBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="morsel-workspace">
        {sidebarOpen && <Sidebar />}
        <div className="morsel-main">
          <EditorGrid split={isSplitView} activeFile={activeTab} />
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

export function TitleBar({ rootName = "morsel" }) {
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
  "pty.rs": `use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::sync::Arc;
use tauri::State;

pub struct PtyManager {
    pair: Arc<dyn MasterPty + Send + Sync>,
}

#[tauri::command]
pub async fn spawn_pty(cols: u16, rows: u16) -> Result<u32, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let cmd = if cfg!(windows) {
        CommandBuilder::new("powershell.exe")
    } else {
        CommandBuilder::new("bash")
    };

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // Sub-100ms startup: raw PTY stream without Node IPC serialization
    Ok(child.process_id().unwrap_or(0))
}`,
  "morsel.config.json": `{
  "$schema": "https://morsel.dev/schema/config.v1.json",
  "editor": {
    "fontFamily": "JetBrains Mono", // taste-skill-ignore
    "fontSize": 13.5,
    "lineHeight": 22,
    "tabSize": 2,
    "formatOnSave": true
  },
  "terminal": {
    "shell": "powershell",
    "ptyStartup": "native",
    "shellIntegration": true
  },
  "viewers": {
    "hex": { "bytesPerLine": 16, "showAscii": true },
    "csv": { "detectDelimiter": true, "maxRows": 50000 },
    "pdf": { "enableThumbnails": true }
  }
}`,
  "benchmarks.csv": `metric,morsel_t3d,electron_editor,delta
cold_startup_ms,84,1420,-94.1%
idle_memory_mb,72,580,-87.6%
pty_spawn_latency_ms,18,310,-94.2%
binary_hex_open_ms,12,850,-98.6%
csv_100k_rows_ms,45,2100,-97.8%`,
  "firmware.hex": `00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
00000010  03 00 3e 00 01 00 00 00  b0 14 00 00 00 00 00 00  |..>.............|
00000020  40 00 00 00 00 00 00 00  98 3f 02 00 00 00 00 00  |@........?......|
00000030  00 00 00 00 40 00 38 00  0b 00 40 00 22 00 21 00  |....@.8...@.".!.|
00000040  06 00 00 00 04 00 00 00  40 00 00 00 00 00 00 00  |........@.......|`,
  "Cargo.toml": `[package]
name = "morsel"
version = "1.220.0"
description = "Morsel - a code editor that respects your palate (AKA Biscuit-v2)"
edition = "2021"

[dependencies]
tauri = { version = "2.1", features = [] }
portable-pty = "0.9"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"`,
  "README.md": `# Morsel

Morsel /ℳℴ𝓇𝓈ℯ𝓁/ is a desktop code editor crafted with Tauri 2, compiled Rust, and Monaco.
`,
  "architecture.pdf": `PDF-1.7
Morsel Architecture Specification v2
1. Native ConPTY / POSIX slave stream
2. Monaco code editor pipeline with 0 latency
3. Web Worker sandboxed background extensions
4. Native data viewers (Hex, CSV, PDF)`,
};

/* ─── File badges matching T3D FileIcon ──────────────────────────────────── */
function FileBadge({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === "Cargo.toml") return <span className="t3d-file-badge t3d-file-badge--toml">TM</span>;
  if (name === "morsel.config.json" || name === "tauri.conf.json")
    return <span className="t3d-file-badge t3d-file-badge--json">&#123;&#125;</span>;
  if (name === "README.md") return <span className="t3d-file-badge t3d-file-badge--md">MD</span>;
  if (ext === "csv") return <span className="t3d-file-badge t3d-file-badge--csv">CSV</span>;
  if (ext === "hex") return <span className="t3d-file-badge t3d-file-badge--hex">HEX</span>;
  if (ext === "pdf") return <span className="t3d-file-badge t3d-file-badge--pdf">PDF</span>;
  if (ext === "rs") return <span className="t3d-file-badge t3d-file-badge--rust">RS</span>;
  if (ext === "tsx" || ext === "ts") return <span className="t3d-file-badge t3d-file-badge--ts">TS</span>;
  return <span className="t3d-file-badge t3d-file-badge--ts">&bull;</span>;
}

const EDITOR_SETUP = {
  lineNumbers: true,
  highlightActiveLine: true,
  foldGutter: false,
  dropCursor: false,
  autocompletion: false,
};

const morselHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "#569cd6" },
  { tag: [t.string, t.special(t.string)], color: "#9ece6a" },
  { tag: [t.number, t.bool, t.null], color: "#b5cea8" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#6a9955" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#dcdcaa" },
  { tag: [t.typeName, t.className, t.namespace], color: "#4ec9b0" },
  { tag: [t.variableName, t.propertyName], color: "#9cdcfe" },
  { tag: [t.operator, t.punctuation], color: "#d4d4d4" },
]);

const EDITOR_THEME = [
  syntaxHighlighting(morselHighlightStyle),
  EditorView.theme({
    "&": {
      backgroundColor: "#141414 !important",
      color: "#d4d4d4",
      height: "100%",
      fontSize: "13px",
      padding: "0",
    },
    ".cm-content": {
      fontFamily: 'Consolas, "JetBrains Mono", monospace', /* taste-skill-ignore */
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
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "40px", padding: "0 10px 0 6px" },
  }),
];

interface TerminalEntry {
  type: "cmd" | "output" | "success" | "info";
  text: string;
}

export default function TedDemo() {
  const [openTabs, setOpenTabs] = useState<string[]>([
    "AppShell.tsx",
    "pty.rs",
    "architecture.pdf",
    "morsel.config.json",
  ]);
  const [activeTab, setActiveTab] = useState<string>("AppShell.tsx");
  const [secondaryTab, setSecondaryTab] = useState<string>("benchmarks.csv");
  const [isSplit, setIsSplit] = useState(false);
  const [csvMode, setCsvMode] = useState<"table" | "raw">("table");
  const [csvSortCol, setCsvSortCol] = useState<number | null>(null);
  const [csvSortAsc, setCsvSortAsc] = useState(true);

  const [sidebarMode, setSidebarMode] = useState<
    "explorer" | "search" | "outline" | "scm" | "debug" | "extensions"
  >("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileFilter, setFileFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("portable_pty");
  const [commitMessage, setCommitMessage] = useState("");
  const [gitDirtyCount, setGitDirtyCount] = useState(2);

  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"terminal" | "problems" | "logs">("terminal");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfPage, setPdfPage] = useState(1);

  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([
    { type: "cmd", text: "morsel --version" },
    { type: "info", text: "morsel 1.220.0 (x86_64-pc-windows-msvc, portable-pty runtime)" },
    { type: "cmd", text: "cargo check" },
    { type: "success", text: "Finished dev [unoptimized + debuginfo] target(s) in 0.08s" },
  ]);

  const [fileContents, setFileContents] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(T3D_SOURCE_CODE))
  );

  // Global keyboard shortcut listener for Ctrl+Shift+P / Cmd+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const runTerminalCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;
    if (trimmed === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    }

    const next: TerminalEntry[] = [...terminalHistory, { type: "cmd", text: trimmed }];

    if (trimmed === "cargo check" || trimmed === "cargo test") {
      next.push({
        type: "success",
        text: "Compiling morsel-core v1.220.0 (portable-pty 0.9.0)",
      });
      next.push({
        type: "success",
        text: "Finished dev/test [unoptimized + debuginfo] target(s) in 0.07s",
      });
    } else if (trimmed === "git status") {
      next.push({ type: "info", text: "On branch main, up to date with origin/main" });
      next.push({ type: "info", text: `Changes not staged: ${gitDirtyCount} file(s) modified` });
    } else if (trimmed === "git diff") {
      next.push({ type: "info", text: "diff --git a/src/layout/AppShell.tsx b/src/layout/AppShell.tsx" });
      next.push({ type: "success", text: "+ const { isSplitView, activeTab } = useWorkspace();" });
    } else if (trimmed === "morsel --info" || trimmed === "morsel --version") {
      next.push({
        type: "info",
        text: "Morsel /ℳℴ𝓇𝓈ℯ𝓁/ v1.220.0 | Tauri 2 | portable-pty | Monaco Core | Sub-100ms PTY",
      });
    } else if (trimmed === "help") {
      next.push({
        type: "info",
        text: "Commands: cargo check, cargo test, git status, git diff, morsel --info, clear",
      });
    } else {
      next.push({ type: "info", text: `Command completed: ${trimmed}` });
    }

    setTerminalHistory(next);
    setTerminalInput("");
  };

  const paletteCommands = [
    {
      id: "split",
      title: "View: Toggle Multi-Pane Split View",
      shortcut: "Ctrl+\\",
      icon: Columns2,
      color: "text-blue-400",
      action: () => setIsSplit((v) => !v),
    },
    {
      id: "term-cargo",
      title: "Terminal: Run cargo check",
      shortcut: "F5",
      icon: Play,
      color: "text-emerald-400",
      action: () => {
        setBottomTab("terminal");
        setBottomOpen(true);
        runTerminalCommand("cargo check");
      },
    },
    {
      id: "term-git",
      title: "Terminal: Run git status",
      shortcut: "",
      icon: GitBranch,
      color: "text-sky-400",
      action: () => {
        setBottomTab("terminal");
        setBottomOpen(true);
        runTerminalCommand("git status");
      },
    },
    {
      id: "open-pdf",
      title: "Viewers: Open Architecture Specification PDF",
      shortcut: "docs",
      icon: FileText,
      color: "text-rose-400",
      action: () => handleFileClick("architecture.pdf"),
    },
    {
      id: "open-csv",
      title: "Viewers: Open Tabular CSV Data Viewer",
      shortcut: "benchmarks.csv",
      icon: Table,
      color: "text-sky-400",
      action: () => handleFileClick("benchmarks.csv"),
    },
    {
      id: "open-hex",
      title: "Viewers: Inspect Binary Hex Dump",
      shortcut: "firmware.hex",
      icon: Binary,
      color: "text-amber-400",
      action: () => handleFileClick("firmware.hex"),
    },
    {
      id: "open-pty",
      title: "Source: Open Native Rust PTY Engine (pty.rs)",
      shortcut: "portable-pty",
      icon: TerminalSquare,
      color: "text-amber-300",
      action: () => handleFileClick("pty.rs"),
    },
    {
      id: "toggle-sidebar",
      title: "View: Toggle Sidebar Panel",
      shortcut: "Ctrl+B",
      icon: FolderTree,
      color: "text-neutral-400",
      action: () => setSidebarOpen((v) => !v),
    },
  ];

  const filteredPaletteCommands = useMemo(() => {
    if (!paletteQuery.trim()) return paletteCommands;
    const q = paletteQuery.toLowerCase();
    return paletteCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.shortcut.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [paletteQuery]);

  const executePaletteCommand = (actionFn: () => void) => {
    setPaletteOpen(false);
    setPaletteQuery("");
    actionFn();
  };

  const parsedCsv = useMemo(() => {
    const raw = fileContents["benchmarks.csv"] || "";
    const lines = raw.trim().split("\n");
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(",");
    let rows = lines.slice(1).map((l) => l.split(","));
    if (csvSortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const valA = a[csvSortCol] || "";
        const valB = b[csvSortCol] || "";
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return csvSortAsc ? numA - numB : numB - numA;
        }
        return csvSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return { headers, rows };
  }, [fileContents, csvSortCol, csvSortAsc]);

  const toggleSort = (colIdx: number) => {
    if (csvSortCol === colIdx) {
      setCsvSortAsc((prev) => !prev);
    } else {
      setCsvSortCol(colIdx);
      setCsvSortAsc(true);
    }
  };

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    setGitDirtyCount(0);
    setTerminalHistory((prev) => [
      ...prev,
      { type: "cmd", text: `git commit -m "${commitMessage.trim()}"` },
      { type: "success", text: "[main 7af5c43] " + commitMessage.trim() },
    ]);
    setCommitMessage("");
  };

  return (
    <div
      className="relative w-full h-[540px] sm:h-[600px] md:h-[640px] overflow-hidden t3d-app-shell rounded-xl border border-neutral-800"
      data-ui="demo-surface"
    >
      {/* ── 1. TitleBar ────────────────────────────────────────────────────── */}
      <header className="t3d-titlebar" data-ui="titlebar">
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
            title="Explorer (Workspace)"
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
            title="Search Workspace"
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
            title="Symbol Outline"
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
            title="Extensions Manager"
            className={`t3d-icon-btn ${sidebarOpen && sidebarMode === "extensions" ? "t3d-icon-btn--active" : ""}`}
          >
            <Blocks size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Center: Project Root Capsule & Quick Command Trigger */}
        <div className="flex items-center gap-2">
          <button type="button" className="t3d-titlebar__project" title="morsel">
            <Folder size={14} strokeWidth={1.75} className="text-[#3b82f6] shrink-0" />
            <span className="truncate">morsel</span>
            <Plus size={14} strokeWidth={1.75} className="text-[#8a8a8a] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700/80 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Open Command Palette (Ctrl+Shift+P)"
          >
            <Command size={11} />
            <kbd className="font-sans">Ctrl+Shift+P</kbd>
          </button>
        </div>

        {/* Right: Actions & Window controls */}
        <div className="t3d-titlebar__actions">
          <button
            type="button"
            onClick={() => setIsSplit((v) => !v)}
            className={`t3d-icon-btn ${isSplit ? "t3d-icon-btn--active" : ""}`}
            title="Toggle Split View"
          >
            <Columns2 size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => runTerminalCommand("cargo check")}
            className="t3d-icon-btn"
            title="Run Rust Check"
          >
            <Play size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="t3d-icon-btn" title="Toggle AI Assistant">
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

      {/* ── Command Palette Overlay Modal ──────────────────────────────────── */}
      {paletteOpen && (
        <div className="t3d-palette-overlay" data-ui="command-palette">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-700/60 bg-neutral-900" data-ui="palette-input">
            <Search size={14} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Type a command or filter actions..."
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-xs text-neutral-200 outline-none placeholder:text-neutral-500 font-sans"
            />
            <button
              type="button"
              onClick={() => setPaletteOpen(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <X size={13} />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 text-xs text-neutral-300">
            {filteredPaletteCommands.length === 0 ? (
              <div className="p-3 text-center text-xs text-neutral-500">
                No commands matching &quot;{paletteQuery}&quot;
              </div>
            ) : (
              filteredPaletteCommands.map((cmd) => {
                const IconComponent = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executePaletteCommand(cmd.action)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent size={13} className={cmd.color} />
                      <span className="font-sans">{cmd.title}</span>
                    </div>
                    {cmd.shortcut && (
                      <span className="text-[11px] text-neutral-500 font-sans">
                        <kbd className="font-sans">{cmd.shortcut}</kbd>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 2. Workspace Islands ───────────────────────────────────────────── */}
      <div className="t3d-workspace" data-ui="workspace">
        {/* Island: Sidebar */}
        {sidebarOpen && (
          <aside className="t3d-island t3d-sidebar" data-ui="sidebar">
            {sidebarMode === "explorer" && (
              <>
                {/* Filter input */}
                <div className="t3d-sidebar__search">
                  <Search size={14} className="text-[#5c5c5c] shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter workspace files..."
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    className="font-sans"
                  />
                  {fileFilter && (
                    <button
                      type="button"
                      onClick={() => setFileFilter("")}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Explorer Toolbar */}
                <div className="t3d-file-tree__toolbar">
                  <span className="t3d-file-tree__title font-sans">WORKSPACE</span>
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
                    filter={fileFilter.toLowerCase()}
                  />
                </div>
              </>
            )}

            {sidebarMode === "search" && (
              <div className="flex-1 flex flex-col p-2 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-400 font-sans uppercase">
                  SEARCH IN WORKSPACE
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded" data-ui="search-box">
                  <Search size={12} className="text-neutral-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search query..."
                    className="w-full bg-transparent text-neutral-200 outline-none text-xs font-sans"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pt-1 text-neutral-400">
                  <div
                    onClick={() => handleFileClick("pty.rs")}
                    className="p-1.5 rounded hover:bg-neutral-800 cursor-pointer"
                  >
                    <div className="font-semibold text-neutral-200">pty.rs</div>
                    <div className="text-[11px] text-neutral-400 pl-2">Line 1: use portable_pty...</div>
                    <div className="text-[11px] text-neutral-400 pl-2">Line 9: spawn_pty(cols, rows)</div>
                  </div>
                  <div
                    onClick={() => handleFileClick("morsel.config.json")}
                    className="p-1.5 rounded hover:bg-neutral-800 cursor-pointer"
                  >
                    <div className="font-semibold text-neutral-200">morsel.config.json</div>
                    <div className="text-[11px] text-neutral-400 pl-2">Line 10: &quot;ptyStartup&quot;: &quot;native&quot;</div>
                  </div>
                </div>
              </div>
            )}

            {sidebarMode === "scm" && (
              <div className="flex-1 flex flex-col p-2.5 space-y-3 text-xs">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-semibold text-[11px] uppercase font-sans">SOURCE CONTROL</span>
                  <span className="text-[11px] text-blue-400 font-sans">main</span>
                </div>
                <form onSubmit={handleCommit} className="space-y-2">
                  <textarea
                    rows={2}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message (Enter to commit)..."
                    data-ui="commit-textarea" className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 outline-none text-xs resize-none font-sans"
                  />
                  <button
                    type="submit"
                    className="w-full py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition-colors"
                  >
                    Commit to main
                  </button>
                </form>
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-neutral-500 font-semibold uppercase">
                    CHANGES ({gitDirtyCount})
                  </div>
                  {gitDirtyCount > 0 ? (
                    <>
                      <div
                        onClick={() => handleFileClick("AppShell.tsx")}
                        className="flex items-center justify-between p-1 rounded hover:bg-neutral-800 cursor-pointer"
                      >
                        <span className="text-neutral-300">src/layout/AppShell.tsx</span>
                        <span className="text-amber-400 font-bold text-[10px]">M</span>
                      </div>
                      <div
                        onClick={() => handleFileClick("README.md")}
                        className="flex items-center justify-between p-1 rounded hover:bg-neutral-800 cursor-pointer"
                      >
                        <span className="text-neutral-300">README.md</span>
                        <span className="text-emerald-400 font-bold text-[10px]">U</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-neutral-500 text-[11px] italic py-2">
                      Working tree clean. Zero uncommitted changes.
                    </div>
                  )}
                </div>
              </div>
            )}

            {sidebarMode === "outline" && (
              <div className="flex-1 flex flex-col p-2 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-400 font-sans uppercase">
                  OUTLINE: {activeTab}
                </span>
                <div className="space-y-1 text-neutral-300">
                  <div className="flex items-center gap-1.5 p-1 rounded hover:bg-neutral-800 cursor-pointer">
                    <span className="text-sky-400 text-[10px] font-sans">fn</span>
                    <span className="font-sans">AppShell()</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 pl-4 rounded hover:bg-neutral-800 cursor-pointer">
                    <span className="text-blue-400 text-[10px] font-sans">prop</span>
                    <span className="font-sans">isSplitView</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 pl-4 rounded hover:bg-neutral-800 cursor-pointer">
                    <span className="text-blue-400 text-[10px] font-sans">prop</span>
                    <span className="font-sans">bottomTab</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 pl-4 rounded hover:bg-neutral-800 cursor-pointer">
                    <span className="text-emerald-400 text-[10px] font-sans">cmp</span>
                    <span className="font-sans">TitleBar</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 pl-4 rounded hover:bg-neutral-800 cursor-pointer">
                    <span className="text-emerald-400 text-[10px] font-sans">cmp</span>
                    <span className="font-sans">EditorGrid</span>
                  </div>
                </div>
              </div>
            )}

            {sidebarMode === "extensions" && (
              <div className="flex-1 flex flex-col p-2 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-400 font-sans uppercase">
                  INSTALLED EXTENSIONS
                </span>
                <div className="space-y-2 overflow-y-auto">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200">Rust Analyzer</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-400">ACTIVE</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">LSP diagnostics for Cargo projects</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200">Tokyo Night</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-400">ACTIVE</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Dark VS Code theme port for Monaco</div>
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200">Tabular CSV</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-400">ACTIVE</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">High-performance column data viewer</div>
                  </div>
                </div>
              </div>
            )}

            {sidebarMode === "debug" && (
              <div className="flex-1 flex flex-col p-2 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-neutral-400 font-sans uppercase">
                  RUN &amp; DEBUG
                </span>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="text-neutral-300 font-medium">Launch Morsel Desktop</div>
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab("terminal");
                      setBottomOpen(true);
                      runTerminalCommand("cargo run --bin t3d");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
                  >
                    <Play size={11} />
                    <span>Start Debugging</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Island: Main Editor Area + Bottom Panel */}
        <main className="flex-1 flex flex-col gap-[var(--gap-shell)] min-w-0 min-h-0">
          {/* Top Island: Editor Area (with Split View Support) */}
          <div className="t3d-island flex-1 flex flex-col min-h-0" data-ui="editor-area">
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
                    <span className="truncate font-sans">{tab}</span>
                    <span
                      onClick={(e) => closeTab(e, tab)}
                      className="size-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/10 ml-1"
                    >
                      <X size={11} />
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-1.5 pr-2">
                {activeTab === "benchmarks.csv" && (
                  <button
                    type="button"
                    onClick={() => setCsvMode((m) => (m === "table" ? "raw" : "table"))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
                  >
                    <Table size={11} />
                    <span className="font-sans">{csvMode === "table" ? "Raw Text" : "Table View"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSplit((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                    isSplit ? "bg-blue-600/30 text-blue-300" : "bg-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                  title="Toggle Split Pane"
                >
                  <Columns2 size={11} />
                  <span className="font-sans">{isSplit ? "Single Pane" : "Split"}</span>
                </button>
              </div>
            </div>

            {/* Breadcrumb row */}
            <div className="t3d-editor-area__crumbs">
              <span className="font-sans">morsel</span>
              <span className="text-[#5c5c5c]">/</span>
              <span className="font-sans">
                {activeTab.endsWith(".rs") ? "src-tauri" : activeTab.endsWith(".pdf") ? "docs" : "src"}
              </span>
              <span className="text-[#5c5c5c]">/</span>
              <span className="text-[#e8e8e8] font-sans">{activeTab}</span>
              {activeTab === "morsel.config.json" && (
                <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-400 font-sans">
                  <CheckCircle2 size={11} />
                  <span>Schema Valid</span>
                </span>
              )}
            </div>

            {/* Code / Viewer Surface */}
            <div className="flex-1 relative overflow-hidden bg-[#141414] flex">
              {/* Primary Pane */}
              <div
                data-ui="primary-pane"
                className={`h-full overflow-hidden flex flex-col ${isSplit ? "w-1/2 border-r border-neutral-800" : "w-full"}`}
              >
                {activeTab === "benchmarks.csv" && csvMode === "table" ? (
                  <div className="t3d-table-view">
                    <table>
                      <thead>
                        <tr>
                          {parsedCsv.headers.map((h, i) => (
                            <th
                              key={h}
                              onClick={() => toggleSort(i)}
                              className="cursor-pointer hover:bg-neutral-800 select-none font-sans"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span>{h}</span>
                                <ArrowUpDown size={11} className="opacity-50" />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsv.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, c) => (
                              <td key={c}>
                                <code>{cell}</code>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : activeTab === "firmware.hex" ? (
                  <div className="h-full p-3 overflow-auto text-xs leading-relaxed text-neutral-300 bg-[#121212]">
                    <pre className="m-0 p-0 font-normal">
                      <code>{fileContents["firmware.hex"]}</code>
                    </pre>
                  </div>
                ) : activeTab === "architecture.pdf" ? (
                  <div className="t3d-pdf-viewer" data-ui="pdf-viewer">
                    <div className="t3d-pdf-toolbar">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-rose-400" />
                        <span className="font-sans font-medium text-neutral-200">
                          architecture-spec.pdf
                        </span>
                        <span className="text-[10px] text-neutral-500 font-sans">
                          Page {pdfPage} of 4
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPdfZoom((z) => Math.max(50, z - 10))}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          title="Zoom out"
                        >
                          <ZoomOut size={12} />
                        </button>
                        <span className="text-[10px] font-sans px-1">{pdfZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setPdfZoom((z) => Math.min(150, z + 10))}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          title="Zoom in"
                        >
                          <ZoomIn size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="t3d-pdf-doc">
                      <div className="t3d-pdf-page space-y-3 font-sans text-xs">
                        <div className="text-base font-semibold text-neutral-100 border-b border-neutral-700/60 pb-2" data-ui="pdf-heading">
                          Morsel Subsystem Architecture Specification
                        </div>
                        <p className="text-neutral-300 leading-relaxed">
                          Morsel decouples editor input dispatch from pseudoterminal process execution. The frontend layer runs inside a native operating system webview driven by compiled Rust bindings.
                        </p>
                        <div className="p-3 bg-neutral-900 rounded border border-neutral-800 space-y-2">
                          <div className="font-medium text-neutral-200 flex items-center gap-1.5">
                            <Layers size={13} className="text-blue-400" />
                            <span>Execution Topology</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 leading-normal">
                            [Tauri 2 IPC Core] &harr; [portable-pty slave ConPTY] &harr; [xterm Canvas Viewport]
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800/80">
                            <div className="font-medium text-neutral-200">Cold Startup:</div>
                            <div className="text-emerald-400 font-semibold">&lt; 100 milliseconds</div>
                          </div>
                          <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800/80">
                            <div className="font-medium text-neutral-200">Idle Memory:</div>
                            <div className="text-emerald-400 font-semibold">~68 MB RAM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab ? (
                  <pre className="h-full w-full m-0 p-0 font-normal relative isolate overflow-hidden">
                    <CodeMirror
                      value={fileContents[activeTab] || ""}
                      height="100%"
                      theme={EDITOR_THEME}
                      extensions={docExtensions}
                      onChange={onCodeChange}
                      basicSetup={EDITOR_SETUP}
                    />
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#8a8a8a] font-sans">
                    No editor open
                  </div>
                )}
              </div>

              {/* Secondary Pane (when Split is active) */}
              {isSplit && (
                <div className="h-full w-1/2 overflow-hidden flex flex-col bg-[#131313]">
                  <div data-ui="secondary-header" className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-xs text-neutral-300">
                    <div className="flex items-center gap-2">
                      <FileBadge name={secondaryTab} />
                      <span className="font-sans">{secondaryTab}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSecondaryTab((t) =>
                          t === "benchmarks.csv" ? "morsel.config.json" : "benchmarks.csv"
                        )
                      }
                      className="text-[10px] text-neutral-400 hover:text-white font-sans"
                    >
                      Switch Tab
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {secondaryTab === "benchmarks.csv" ? (
                      <div className="t3d-table-view">
                        <table>
                          <thead>
                            <tr>
                              {parsedCsv.headers.map((h) => (
                                <th key={h} className="font-sans">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedCsv.rows.map((row, i) => (
                              <tr key={i}>
                                {row.map((cell, c) => (
                                  <td key={c}>
                                    <code>{cell}</code>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="h-full w-full m-0 p-0 font-normal">
                        <CodeMirror
                          value={fileContents[secondaryTab] || ""}
                          height="100%"
                          theme={EDITOR_THEME}
                          extensions={docExtensions}
                          basicSetup={EDITOR_SETUP}
                        />
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Island: Panel (Terminal / Problems / Logs) */}
          {bottomOpen && (
            <div className="t3d-island t3d-bottom-panel" data-ui="bottom-panel">
              {/* Header */}
              <div className="t3d-bottom-panel__header">
                <div className="t3d-bottom-panel__tabs">
                  <button
                    type="button"
                    onClick={() => setBottomTab("terminal")}
                    className={`t3d-bottom-panel__tab font-sans ${
                      bottomTab === "terminal" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomTab("problems")}
                    className={`t3d-bottom-panel__tab font-sans ${
                      bottomTab === "problems" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Problems
                    <span className="text-[10px] px-1 rounded bg-neutral-800 text-neutral-300 font-sans">1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomTab("logs")}
                    className={`t3d-bottom-panel__tab font-sans ${
                      bottomTab === "logs" ? "t3d-bottom-panel__tab--active" : ""
                    }`}
                  >
                    Logs
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {bottomTab === "terminal" && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => runTerminalCommand("cargo check")}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors font-sans"
                      >
                        cargo check
                      </button>
                      <button
                        type="button"
                        onClick={() => runTerminalCommand("git status")}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors font-sans"
                      >
                        git status
                      </button>
                      <button
                        type="button"
                        onClick={() => runTerminalCommand("morsel --info")}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors font-sans"
                      >
                        info
                      </button>
                    </div>
                  )}

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

              {/* View: Terminal */}
              {bottomTab === "terminal" && (
                <div className="flex-1 p-2.5 overflow-y-auto bg-[#121212] flex flex-col justify-between text-[11.5px] leading-relaxed">
                  <div className="space-y-1">
                    {terminalHistory.map((item, idx) => (
                      <div key={idx}>
                        {item.type === "cmd" ? (
                          <div className="text-blue-400 font-medium">
                            <samp>PS E:\morsel&gt; {item.text}</samp>
                          </div>
                        ) : item.type === "success" ? (
                          <div className="text-emerald-400">
                            <samp>&bull; {item.text}</samp>
                          </div>
                        ) : (
                          <div className="text-neutral-300">
                            <samp>{item.text}</samp>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Interactive Terminal Prompt */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runTerminalCommand(terminalInput);
                    }}
                    data-ui="prompt-form" className="mt-2 flex items-center gap-1.5 text-neutral-400 border-t border-neutral-800/80 pt-1.5"
                  >
                    <span className="text-blue-400 font-medium">
                      <code>PS&gt;</code>
                    </span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Type cargo check, git status, help, clear..."
                      className="flex-1 bg-transparent text-neutral-200 outline-none text-xs placeholder:text-neutral-600 font-sans"
                    />
                  </form>
                </div>
              )}

              {/* View: Problems */}
              {bottomTab === "problems" && (
                <div className="flex-1 p-3 overflow-y-auto bg-[#121212] text-xs text-neutral-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <Info size={13} className="text-blue-400 shrink-0" />
                    <span className="font-medium text-neutral-200 font-sans">morsel.config.json</span>
                    <span className="text-neutral-500 font-sans">[1, 1]</span>
                    <span className="text-neutral-400 font-sans">Schema validated against config.v1.json</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span className="font-medium text-neutral-200 font-sans">src-tauri/src/pty.rs</span>
                    <span className="text-neutral-500 font-sans">[24, 5]</span>
                    <span className="text-neutral-400 font-sans">portable-pty native process binding ready</span>
                  </div>
                </div>
              )}

              {/* View: Logs */}
              {bottomTab === "logs" && (
                <div className="flex-1 p-2.5 overflow-y-auto bg-[#121212] text-[11px] leading-relaxed text-neutral-400">
                  <pre className="m-0 p-0 font-normal">
                    <code>
{`[00:00.018] [tauri::runtime] initialization complete (x86_64-pc-windows-msvc)
[00:00.042] [pty::portable] ConPTY session bound to slave channel fd:3
[00:00.065] [editor::monaco] language service registered (typescript, rust, toml, json)
[00:00.088] [viewers::catalog] hex-viewer, tabular-csv, and pdfjs listeners attached
[00:00.104] [workspace::grid] 2D pane split engine ready`}
                    </code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── 3. StatusBar ───────────────────────────────────────────────────── */}
      <footer className="t3d-status-bar border-t border-neutral-800" data-ui="statusbar">
        <div className="t3d-status-bar__group">
          <button
            type="button"
            className="t3d-status-bar__chip font-sans"
            title="Source Control"
            onClick={() => {
              setSidebarMode("scm");
              setSidebarOpen(true);
            }}
          >
            <GitBranch size={13} className="text-[#3b82f6]" />
            <span className="font-sans">main</span>
            <span className="t3d-status-bar__sync font-sans">●{gitDirtyCount}</span>
          </button>

          <button
            type="button"
            className="t3d-status-bar__chip font-sans"
            title="Workspace folder"
          >
            <Folder size={13} className="text-[#60a5fa]" />
            <span className="font-sans">morsel</span>
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
            className="t3d-status-bar__chip font-sans"
            title="Problems"
            onClick={() => {
              setBottomTab("problems");
              setBottomOpen(true);
            }}
          >
            <AlertCircle size={13} className="text-[#73c991]" />
            <span className="font-sans">1</span>
          </button>
        </div>

        <div className="t3d-status-bar__group font-sans">
          <span className="t3d-status-bar__item font-sans">Ln 14, Col 28</span>
          <span className="t3d-status-bar__item font-sans">Spaces: 2</span>
          <span className="t3d-status-bar__item font-sans">UTF-8</span>
          <span className="t3d-status-bar__item text-[#e8e8e8] font-sans">
            {activeTab.endsWith(".rs")
              ? "Rust"
              : activeTab.endsWith(".json")
              ? "JSON"
              : activeTab.endsWith(".csv")
              ? "CSV Table"
              : activeTab.endsWith(".hex")
              ? "Hex Dump"
              : activeTab.endsWith(".pdf")
              ? "PDF Document"
              : "TypeScript JSX"}
          </span>
          <button type="button" className="t3d-icon-btn" title="Notifications">
            <Bell size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ─── Tree branch renderer with indent levels and filtering ──────────────── */
const TreeBranch = memo(
  ({
    nodes,
    depth,
    activeTab,
    onFileClick,
    filter,
  }: {
    nodes: TreeNode[];
    depth: number;
    activeTab: string;
    onFileClick: (n: string) => void;
    filter: string;
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
            filter={filter}
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
    filter,
  }: {
    node: TreeNode;
    depth: number;
    activeTab: string;
    onFileClick: (n: string) => void;
    filter: string;
  }) => {
    const [open, setOpen] = useState(true);
    const isActive = activeTab === node.name;
    const paddingLeft = 4 + depth * 12;

    if (filter) {
      const matchSelf = node.name.toLowerCase().includes(filter);
      const matchChild =
        node.isDir &&
        node.children?.some(
          (c) =>
            c.name.toLowerCase().includes(filter) ||
            (c.isDir && c.children?.some((cc) => cc.name.toLowerCase().includes(filter)))
        );
      if (!matchSelf && !matchChild) return null;
    }

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

          <span className="truncate flex-1 font-sans">{node.name}</span>

          {node.status === "modified" && (
            <span className="text-[10px] text-amber-400 font-bold shrink-0 font-sans">M</span>
          )}
          {node.status === "new" && (
            <span className="text-[10px] text-emerald-400 font-bold shrink-0 font-sans">U</span>
          )}
        </button>

        {node.isDir && open && node.children && (
          <TreeBranch
            nodes={node.children}
            depth={depth + 1}
            activeTab={activeTab}
            onFileClick={onFileClick}
            filter={filter}
          />
        )}
      </>
    );
  }
);
TreeRow.displayName = "TreeRow";
