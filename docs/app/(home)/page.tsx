"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { 
  Check, 
  Terminal, 
  ExternalLink, 
  Cpu, 
  Search, 
  Bug, 
  Settings, 
  Layers, 
  Code,
  GitBranch, 
  Copy, 
  Heart,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  Folder,
  FileText,
  Menu,
  X
} from "lucide-react";

// Screenshot assets defined outside to prevent useEffect re-renders
const screenshots = [
  {
    id: "overview",
    title: "Overview",
    src: "https://github.com/user-attachments/assets/ac5254cc-e1ac-4fe6-a582-51b5129756e3",
    alt: "biscuit editor interface overview"
  },
  {
    id: "lsp-agents",
    title: "LSP & Agents",
    src: "https://github.com/user-attachments/assets/30b52da7-af5b-490b-912a-fb8b4d61dcb0",
    alt: "language servers and AI agents integration panel"
  },
  {
    id: "fast-search",
    title: "Fast Search",
    src: "https://github.com/user-attachments/assets/d4ef7657-f37b-40ab-b9b1-c00d45e7f764",
    alt: "ripgrep fast search in biscuit editor statusbar"
  },
  {
    id: "extensions",
    title: "Extensions",
    src: "https://github.com/user-attachments/assets/91ab0044-2eac-4c20-972d-6719002edb1a",
    alt: "biscuit editor built-in extensions marketplace manager"
  },
  {
    id: "split-preview",
    title: "Split View",
    src: "https://github.com/user-attachments/assets/1c44aab4-d8d1-4ba8-b92b-73c0c6dbfb00",
    alt: "split preview editor panes"
  }
];

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-900/50" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// Copy Installer Snippet Component
function InstallerSnippet() {
  const [copied, setCopied] = useState(false);
  const command = "pip install biscuit-editor";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between font-mono text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-4 py-3 w-full max-w-md my-4 text-zinc-800 dark:text-zinc-200">
      <div className="flex items-center gap-2">
        <span className="text-amber-600 dark:text-amber-500 select-none font-bold">&gt;</span>
        <span>{command}</span>
      </div>
      <button 
        onClick={copyToClipboard}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        aria-label="Copy installation command"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

interface MockFile {
  name: string;
  title: string;
  lines: string[];
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState("overview");
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [activeFileIdx, setActiveFileIdx] = useState(0);

  // Automated transition hook for screenshots slideshow
  useEffect(() => {
    if (!isAutoplay) return;

    const interval = setInterval(() => {
      setActiveScreenshot((prev) => {
        const currentIdx = screenshots.findIndex((s) => s.id === prev);
        const nextIdx = (currentIdx + 1) % screenshots.length;
        return screenshots[nextIdx].id;
      });
    }, 4500); // Transition every 4.5 seconds

    return () => clearInterval(interval);
  }, [isAutoplay]);

  const mockFiles: MockFile[] = [
    {
      name: "agents.md",
      title: "Agents & LLMs",
      lines: [
        "# Agents & LLMs",
        "",
        "[x] Gemini & Anthropic API support",
        "    - claude-4-5-opus / sonnet / haiku",
        "    - gemini-2-5-flash / pro",
        "[x] Planning agent with dynamic task list & 11 tools:",
        "    - ReadFileTool, EditFileTool, DeleteFileTool",
        "    - ListDirTool, GlobFileSearchTool, GrepTool",
        "    - CodebaseSearchTool, RunTerminalCmdTool",
        "    - TodoWriteTool, GetWorkspaceInfoTool, GetActiveEditorTool",
        "[x] Add more LLM providers through biscuit extensions",
        "[x] Attach files for adding context in chat",
        "[x] LLM calls inside biscuit terminals",
        "    - Use `# your prompt` in terminal & accept/decline",
        "[ ] LLM provider extension examples (old ones deprecated)",
        "[x] Run local LLMs with ollama extension (deprecated)",
        "[ ] Ollama extension rewrite"
      ]
    },
    {
      name: "code-intel.md",
      title: "Code Intelligence",
      lines: [
        "# Code Intelligence",
        "",
        "[x] Fast tree-sitter based parsing and highlights",
        "[x] Code completions within editor (with type-specific icons)",
        "[x] Hover for symbol definition / docstrings",
        "    - Rendered with syntax highlights & markdown support",
        "[x] Symbol outline sidebar panel for navigating large files",
        "[x] Global symbol search through command palette (Ctrl + J)",
        "[x] Floating peek widget to jump-to-definition/declaration",
        "[x] Symbol references highlighting in the open editor",
        "[x] Register custom language servers through extensions",
        "    - Example extensions: rust, clangd"
      ]
    },
    {
      name: "git-versioning.md",
      title: "Source Control",
      lines: [
        "# Source Control",
        "",
        "[x] Split diff viewer for changes / staged changes",
        "[x] Essential git operations accessible from the UI",
        "    - Push, pull, commit, stage, unstage, switch branches",
        "[x] Clone git repositories and open directly in active window",
        "[x] View GitHub issues & pull requests within editor",
        "    - TODO: disabled right now, converting to an extension"
      ]
    },
    {
      name: "ripgrep-search.md",
      title: "Fast Search",
      lines: [
        "# Fast Search",
        "",
        "[x] Ripgrep-based ultra-fast search from statusbar",
        "[x] Replace occurrences individually or all at once",
        "[x] Regex support, case-sensitive search, & customization",
        "[x] Search within open editors with floating find-replace widget"
      ]
    },
    {
      name: "debuggers.md",
      title: "Debugging",
      lines: [
        "# Code Debugging",
        "",
        "[x] Setting breakpoints across files",
        "[x] Inspection panel for all runtime variables",
        "[x] Modify runtime variables while debugging",
        "[x] Call stack visualization and exception tracing",
        "[x] Built-in Python debugger support",
        "[x] Register custom debuggers through extensions",
        "[ ] Full DAP (Debug Adapter Protocol) client integration"
      ]
    },
    {
      name: "extensions.md",
      title: "Extensions Ecosystem",
      lines: [
        "# Extensions Manager",
        "",
        "[x] Install & manage extensions through dedicated GUI manager",
        "[x] Extension search & discovery inside the editor",
        "[x] CLI bootstrapping commands and templates for fast setup",
        "[x] Detailed extension development documentation",
        "[x] Extension marketplace website ecosystem"
      ]
    },
    {
      name: "misc-features.md",
      title: "Editor & Misc",
      lines: [
        "# Editor Details",
        "",
        "[x] Split markdown editor & plain HTML renderer side-by-side",
        "[x] Toggle relative line numbering for faster keyboard actions",
        "[x] Editorconfig support for project formatting standards",
        "[x] Drag-and-drop to open files or folders in biscuit",
        "[x] Sophisticated command palette with static search commands",
        "[x] Add custom code formatters via extensions",
        "    - Black, Ruff, YAPF, autopep8 (deprecated references)",
        "[ ] Vim mode support"
      ]
    }
  ];

  const activeImage = screenshots.find(s => s.id === activeScreenshot) || screenshots[0];
  const activeFile = mockFiles[activeFileIdx];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Custom Minimalist Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900 px-6 py-4 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 font-mono font-bold text-lg select-none">
            <img src="/logo.svg" alt="biscuit logo" className="h-6 w-6" />
            <span>biscuit</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 font-mono text-sm">
            <Link href="/docs" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors">
              documentation
            </Link>
            <a 
              href="https://biscuit-extensions.github.io/marketplace/"
              target="_blank"
              rel="noopener noreferrer" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors flex items-center gap-1"
            >
              marketplace <ExternalLink className="h-3 w-3" />
            </a>
            <a 
              href="https://github.com/tomlin7/biscuit"
              target="_blank"
              rel="noopener noreferrer" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors flex items-center gap-1"
            >
              github <ExternalLink className="h-3 w-3" />
            </a>
            <a 
              href="https://github.com/sponsors/tomlin7"
              target="_blank"
              rel="noopener noreferrer" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors flex items-center gap-1"
            >
              sponsor <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
            </a>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800"></div>
            <ThemeToggle />
          </div>

          {/* Mobile Navigation controls */}
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-zinc-200 dark:border-zinc-900 rounded text-zinc-600 dark:text-zinc-400"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-900 mt-4 pt-4 pb-2 flex flex-col gap-4 font-mono text-sm">
            <Link 
              href="/docs" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 px-2"
            >
              documentation
            </Link>
            <a 
              href="https://biscuit-extensions.github.io/marketplace/"
              target="_blank"
              rel="noopener noreferrer" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 px-2 flex items-center gap-1"
            >
              marketplace <ExternalLink className="h-3 w-3" />
            </a>
            <a 
              href="https://github.com/tomlin7/biscuit"
              target="_blank"
              rel="noopener noreferrer" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 px-2 flex items-center gap-1"
            >
              github <ExternalLink className="h-3 w-3" />
            </a>
            <a 
              href="https://github.com/sponsors/tomlin7"
              target="_blank"
              rel="noopener noreferrer" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 px-2 flex items-center gap-1.5"
            >
              sponsor <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
            </a>
          </div>
        )}
      </nav>

      {/* Hero Grid Section */}
      <header className="max-w-6xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left column: Branding & installation (Compact 4-cols for wider layout) */}
        <div className="lg:col-span-4 flex flex-col items-start text-left">
          <div className="flex items-center gap-3 mb-4 select-none">
            <img src="/logo.svg" alt="biscuit logo" className="h-12 w-12" />
            <span className="font-mono text-zinc-500 dark:text-zinc-500 font-bold">&gt;_</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tight mb-4">
            biscuit
          </h1>

          <p className="text-md text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed mb-6">
            a fast, extensible, native code editor with agents. 
            lightweight &lt;20 mb in size. install and start using in seconds.
          </p>

          <InstallerSnippet />

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full mt-2">
            <Link 
              href="/docs" 
              className="flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold rounded bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-zinc-950 transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              read docs
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            
            <a 
              href="https://github.com/tomlin7/biscuit"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5" />
              github repo
            </a>
          </div>
        </div>

        {/* Right column: Wider Borderless Mock Editor Screenshot Viewer (Expanded to 8-cols) */}
        <div className="lg:col-span-8 w-full flex flex-col">
          {/* Tab switches */}
          <div className="flex flex-wrap gap-1 mb-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {screenshots.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveScreenshot(s.id);
                  setIsAutoplay(false); // Stop autoplay when user manually interacts
                }}
                className={`px-3 py-1.5 border rounded-t transition-all cursor-pointer font-bold ${
                  activeScreenshot === s.id
                    ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 border-b-transparent text-amber-600 dark:text-amber-500"
                    : "bg-zinc-100/50 dark:bg-zinc-950 border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Screenshot viewport (No border, fade-in transition, larger layout) */}
          <div className="w-full aspect-[16/10] flex items-center justify-center overflow-hidden">
            <img 
              key={activeScreenshot}
              src={activeImage.src} 
              alt={activeImage.alt}
              className="w-full h-full object-contain select-none animate-fade-in"
            />
          </div>
          <div className="mt-3 text-center text-[11px] font-mono text-zinc-400 dark:text-zinc-600">
            {activeImage.alt}
          </div>
        </div>

      </header>

      <hr className="border-zinc-200 dark:border-zinc-900 max-w-6xl mx-auto w-full px-6" />

      {/* Editor Mockup Feature Board Section */}
      <section className="max-w-6xl mx-auto w-full py-16 px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-mono font-bold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-amber-500" />
            workspace explorer
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-mono mt-1">
            inspect the implemented progress code files in a simulated biscuit editor interface.
          </p>
        </div>

        {/* Mock Editor Workspace Container */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 flex flex-col md:flex-row min-h-[500px] shadow-sm">
          
          {/* Mock Sidebar Explorer */}
          <div className="w-full md:w-56 bg-zinc-50 dark:bg-zinc-900/40 border-r border-zinc-200 dark:border-zinc-900 flex flex-col font-mono text-xs select-none">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600 uppercase font-bold tracking-wider text-[10px]">
              explorer: biscuit
            </div>
            
            {/* File Tree hierarchy */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-semibold px-1">
                <Folder className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span>src/progress</span>
              </div>
              
              <div className="pl-4 flex flex-col gap-1">
                {mockFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFileIdx(idx)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors cursor-pointer w-full ${
                      activeFileIdx === idx
                        ? "bg-zinc-200 dark:bg-zinc-800 text-amber-600 dark:text-amber-500 font-bold"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 opacity-70" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mock Editor Content area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 font-mono text-sm overflow-hidden">
            {/* File Tabs header */}
            <div className="flex items-center border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20 text-xs text-zinc-500">
              <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 font-bold text-amber-600 dark:text-amber-500 border-t-2 border-t-amber-600 dark:border-t-amber-500">
                <FileText className="h-3.5 w-3.5" />
                <span>{activeFile.name}</span>
              </div>
            </div>

            {/* Code pane layout */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[450px] flex-1 flex select-text">
              {/* Line numbers column */}
              <div className="text-zinc-300 dark:text-zinc-800 pr-4 text-right select-none border-r border-zinc-100 dark:border-zinc-900 w-10">
                {activeFile.lines.map((_, idx) => (
                  <div key={idx} className="leading-6 text-[12px]">{idx + 1}</div>
                ))}
              </div>

              {/* Code text content */}
              <div className="pl-4 flex-1 space-y-0 leading-6 text-[13px] overflow-x-auto text-zinc-800 dark:text-zinc-300">
                {activeFile.lines.map((line, idx) => {
                  // Custom rendering colors based on text type to make it look syntax highlighted
                  let isHeader = line.startsWith("#");
                  let isChecked = line.startsWith("[x]");
                  let isPlanned = line.startsWith("[ ]");
                  
                  let textColorClass = "text-zinc-800 dark:text-zinc-300";
                  if (isHeader) textColorClass = "text-amber-600 dark:text-amber-500 font-bold text-base border-b border-zinc-100 dark:border-zinc-900 pb-1 mb-2 block";
                  else if (isChecked) textColorClass = "text-zinc-800 dark:text-zinc-200";
                  else if (isPlanned) textColorClass = "text-zinc-400 dark:text-zinc-600";
                  
                  return (
                    <div key={idx} className={`${textColorClass} whitespace-pre`}>
                      {isChecked && (
                        <span className="text-emerald-500 dark:text-emerald-500 font-bold mr-1.5">✔</span>
                      )}
                      {isPlanned && (
                        <span className="text-zinc-400 dark:text-zinc-600 font-bold mr-1.5">☐</span>
                      )}
                      {(isChecked || isPlanned) ? line.slice(3) : line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mock Editor statusbar */}
            <div className="bg-amber-600 dark:bg-amber-500 text-white dark:text-zinc-950 px-4 py-1.5 flex items-center justify-between text-[11px] select-none font-bold uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>utf-8</span>
                <span>markdown</span>
              </div>
              <div>
                <span>biscuit status: ready</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      <hr className="border-zinc-200 dark:border-zinc-900 max-w-6xl mx-auto w-full px-6" />

      {/* Getting Started & contributing */}
      <section className="max-w-6xl mx-auto w-full py-16 px-6 grid grid-cols-1 md:grid-cols-2 gap-12 font-mono">
        
        {/* Getting started */}
        <div>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 uppercase tracking-wider text-zinc-500">
            <ArrowRight className="h-4 w-4 text-amber-500" />
            getting started
          </h2>
          
          <div className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <p className="text-zinc-800 dark:text-zinc-200 mb-2 font-bold">1. installation</p>
              <p className="mb-2">install the latest stable release via pip package manager:</p>
              <pre className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-3 text-zinc-800 dark:text-zinc-200 text-xs">
                pip install biscuit-editor
              </pre>
            </div>
            
            <div>
              <p className="text-zinc-800 dark:text-zinc-200 mb-2 font-bold">2. run and open projects</p>
              <p className="mb-2">launch the editor and open a target workspace directory instantly:</p>
              <pre className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-3 text-zinc-800 dark:text-zinc-200 text-xs">
                biscuit path/to/src
              </pre>
            </div>

            <p className="text-xs">
              see other installation formats (including compiled executable releases) in the{" "}
              <a 
                href="https://tomlin7.github.io/biscuit/getting-started/installation/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-600 dark:text-amber-500 hover:underline"
              >
                installation guide
              </a>.
            </p>
          </div>
        </div>

        {/* Contributing & support */}
        <div>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 uppercase tracking-wider text-zinc-500">
            <Heart className="h-4 w-4 text-amber-500" />
            contributing
          </h2>
          
          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            <p>
              biscuit is fully open source. contributions of any scope are highly appreciated!
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                <a 
                  href="https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-500 underline"
                >
                  contributing guidelines
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                <a 
                  href="https://tomlin7.github.io/biscuit/getting-started/quick-start/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-500 underline"
                >
                  quick start developer guide
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                <a 
                  href="https://github.com/tomlin7/biscuit-extensions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-500 underline"
                >
                  extension API documentation
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
                <a 
                  href="https://github.com/sponsors/tomlin7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-500 underline flex items-center gap-1.5"
                >
                  sponsor the project <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                </a>
              </li>
            </ul>

            <p className="text-xs pt-2">
              documentation is a work-in-progress. feel free to inspect our code palette or ask on our deepwiki!
            </p>
          </div>
        </div>

      </section>

      {/* Footer Section */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-950 py-8 px-6 font-mono text-xs text-zinc-500 dark:text-zinc-600">
        <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} biscuit editor. MIT License.
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/tomlin7/biscuit/blob/main/LICENSE" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-zinc-800 dark:hover:text-zinc-400 underline"
            >
              license terms
            </a>
            <span>&bull;</span>
            <a 
              href="https://github.com/tomlin7/biscuit" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-zinc-800 dark:hover:text-zinc-400 underline"
            >
              github
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
