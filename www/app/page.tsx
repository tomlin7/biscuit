"use client";

import { useState } from "react";
import TedDemo from "@/components/TedDemo";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "size-6"} aria-hidden="true">
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export default function Page() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedClone, setCopiedClone] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState<"powershell" | "sh" | "cargo">("powershell");

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleCopyClone = () => {
    void navigator.clipboard.writeText("git clone https://github.com/tomlin7/Morsel.git");
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const getCliCommand = () => {
    if (activeInstallTab === "powershell") return "irm https://t3d.sh/install.ps1 | iex";
    if (activeInstallTab === "sh") return "curl -fsSL https://t3d.sh/install.sh | sh";
    return "cargo install morsel-editor";
  };

  const handleCopyCli = () => {
    void navigator.clipboard.writeText(getCliCommand());
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const faqs = [
    {
      q: "Is Morsel another Electron application?",
      a: "No. Morsel runs on Tauri 2 and compiled Rust on top of your operating system native webview runtime. It uses a fraction of the RAM of typical Electron editors and launches in under 100 milliseconds.",
    },
    {
      q: "How does the terminal differ from other editors?",
      a: "Morsel spawns pseudoterminals directly through native Rust using portable-pty. Keystrokes, terminal resize events, and ANSI sequences bypass Node.js serialization completely, rendering directly into xterm with full OSC 7 and OSC 133 shell integration.",
    },
    {
      q: "Do extensions run in the main thread?",
      a: "No. Extensions execute in background Web Workers and sandboxed webviews with manifest permissions for network, clipboard, workspace, and scm. Heavy extension tasks cannot freeze the Monaco typing pipeline or the editor interface.",
    },
    {
      q: "What specialized file viewers come pre-installed?",
      a: "Morsel includes dedicated viewers out of the box: a Hex inspector for binary files with byte grids and ASCII decoding, a tabular CSV/TSV visualizer with column sorting, and a PDF viewer powered by pdfjs-dist.",
    },
    {
      q: "Where does my data live?",
      a: "Projects, sessions, configurations, and local logs live on your disk. No account, no telemetry, and no cloud between you and your machine.",
    },
    {
      q: "How do I build Morsel from source?",
      a: "Clone the repository, install Bun and the Rust toolchain with Cargo, then run bun install followed by bun run tauri dev.",
    },
  ];

  return (
    <div className="min-h-dvh antialiased bg-background text-foreground font-sans">
      {/* ── Outer Container (1100px max width) ──────────────────────────── */}
      <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 md:px-10">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex h-16 items-center justify-between animate-morsel-enter">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background font-bold text-[13px] tracking-tight">
              M
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">Morsel</span>
              <span className="text-[13px] text-muted-foreground">v1.220.0</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground">
            <a href="#demo" className="hover:text-foreground transition-colors">Editor Canvas</a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#shortcuts" className="hover:text-foreground transition-colors">Shortcuts</a>
            <a href="#download" className="hover:text-foreground transition-colors">Download</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/tomlin7/Morsel"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub Repository"
              className="rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground"
            >
              <GithubIcon className="size-5" />
            </a>
            <a
              href="#download"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3.5 text-[13px] font-medium transition-colors"
            >
              Download
            </a>
          </div>
        </header>

        <main id="main-content">
          {/* ── Section 0: Hero ────────────────────────────────────────────── */}
          <section className="pt-14 pb-14 md:pt-20 md:pb-16">
            <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl md:text-[3.2rem] md:leading-[1.06] animate-morsel-enter">
              A code editor that respects your palate.
            </h1>

            <p className="mt-5 max-w-[38rem] text-[17px] leading-relaxed text-pretty text-muted-foreground animate-morsel-enter">
              Morsel unites compiled Rust, Monaco, and native pseudoterminals in a quiet desktop window. Fast startup, zero telemetry, multi-pane drag-to-split grids, and specialized binary and data inspectors.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 animate-morsel-enter">
              <a
                href="#download"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 px-4 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="size-4" />
                <span>Download v1.220.0</span>
              </a>

              <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
                <code>git clone https://github.com/tomlin7/Morsel.git</code>
                <button
                  type="button"
                  onClick={handleCopyClone}
                  aria-label="Copy clone command"
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedClone ? <CheckIcon className="size-3.5 text-emerald-400" /> : <CopyIcon className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-muted-foreground animate-morsel-enter">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Tauri 2 Runtime
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Compiled Rust
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Monaco Engine
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                portable-pty Sub-100ms
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Zero Telemetry
              </span>
            </div>
          </section>

          {/* ── Section 1: Interactive App Canvas ─────────────────────────── */}
          <section id="demo" className="py-12 md:py-16">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 animate-morsel-enter">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                  Interactive editor surface
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Explore tabs, split views, runnable terminal commands, CSV tables, and hex dumps in this live preview.
                </p>
              </div>
              <div className="text-[13px] text-muted-foreground flex items-center gap-2">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[13px]">Ctrl+Shift+P</kbd> for palette</span>
              </div>
            </div>

            <div className="rounded-xl bg-card p-2 sm:p-4 animate-morsel-enter" data-ui="morsel-editor">
              <TedDemo />
            </div>
          </section>

          {/* ── Section 2: Core Capabilities ──────────────────────────────── */}
          <section id="capabilities" className="py-16 md:py-24">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Core capabilities
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground max-w-xl">
                Engineered for responsive execution, deep symbol inspection, and zero cloud friction across desktop systems.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 animate-morsel-enter">
              {/* Column 1: Core Subsystems */}
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Multi-pane drag-to-split grid
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Split workspaces horizontally or vertically into independent viewports. Drag tabs across pane groups with synchronized cursor tracking, individual zoom levels, and layout persistence across restarts.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Sub-100ms native Rust PTY
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Direct process execution via portable-pty with zero Node IPC serialization overhead. Supports PowerShell, Bash, and Zsh with live OSC 7 directory sync and OSC 133 semantic shell integration.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    JSON Schema validation &amp; store
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Real-time schema validation and completions for configuration files. Automatic schema binding for tauri.conf.json, tsconfig.json, package.json, and custom project manifests.
                  </p>
                </div>
              </div>

              {/* Column 2: Data Viewers & Extension Runtime */}
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Specialized data &amp; binary viewers
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Dedicated non-code inspectors out of the box: Hex editor with byte offsets and ASCII decoding, tabular CSV/TSV visualizer with column sorting and delimiter parsing, and integrated PDF documentation reader.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Sandboxed worker extensions
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Extensions run asynchronously in background Web Workers and sandboxed webviews with manifest permissions for filesystem, SCM, and network. Long-running tasks cannot degrade editor typing latency.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Installable icon &amp; color themes
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Compatible with standard VS Code theme formats and icon packs. Wrapped in custom graphite island chrome with high-contrast accessibility and zero visual clutter.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Technical Architecture Comparison ──────────────── */}
          <section id="architecture" className="py-14 md:py-20 my-8 rounded-2xl bg-neutral-900/30 px-6 sm:px-10">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Architecture comparison
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Direct measurement against traditional Electron-based desktop editors.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto animate-morsel-enter">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground" data-ui="table-row">
                    <th className="py-3 pr-4 font-medium">Metric / Subsystem</th>
                    <th className="py-3 px-4 font-medium text-foreground">Morsel (T3D)</th>
                    <th className="py-3 pl-4 font-medium text-muted-foreground">Traditional Electron Editor</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Runtime Architecture</td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">Tauri 2 + Compiled Rust</td>
                    <td className="py-3.5 pl-4">Chromium + Node.js runtime</td>
                  </tr>
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Cold Window Startup</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">&lt; 100 milliseconds</td>
                    <td className="py-3.5 pl-4">1,400ms – 2,800ms</td>
                  </tr>
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Idle Memory Footprint</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">~65 – 85 MB RAM</td>
                    <td className="py-3.5 pl-4">480 – 850 MB RAM</td>
                  </tr>
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Terminal IPC Pipeline</td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">Direct OS pipe (portable-pty)</td>
                    <td className="py-3.5 pl-4">Multi-hop Node.js serialization</td>
                  </tr>
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Telemetry &amp; Analytics</td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">Zero telemetry, 100% local disk</td>
                    <td className="py-3.5 pl-4">Periodic cloud telemetry pings</td>
                  </tr>
                  <tr className="border-b border-border/40" data-ui="table-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">Extension Sandboxing</td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">Isolated Web Workers + Manifest permissions</td>
                    <td className="py-3.5 pl-4">Shared main thread / Node process</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 4: Keyboard Shortcuts Reference ───────────────────── */}
          <section id="shortcuts" className="py-14 md:py-20 my-8 rounded-2xl bg-neutral-900/40 px-6 sm:px-10">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Keyboard shortcuts
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Over 180 workbench commands accessible without leaving the keyboard.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 animate-morsel-enter">
              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Command Palette</div>
                  <div className="text-[13px] text-muted-foreground">Fuzzy search all commands</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+Shift+P</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Quick Open</div>
                  <div className="text-[13px] text-muted-foreground">Jump to workspace file</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+P</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Split Editor</div>
                  <div className="text-[13px] text-muted-foreground">Split active pane right</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+\</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Toggle Terminal</div>
                  <div className="text-[13px] text-muted-foreground">Show or hide native PTY</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+`</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Toggle Sidebar</div>
                  <div className="text-[13px] text-muted-foreground">Show or hide file tree</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+B</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Source Control</div>
                  <div className="text-[13px] text-muted-foreground">Focus Git diff and commits</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+Shift+G</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Find in Files</div>
                  <div className="text-[13px] text-muted-foreground">Search text across project</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+Shift+F</kbd>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60" data-ui="table-row">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Go to Line</div>
                  <div className="text-[13px] text-muted-foreground">Jump to line:column</div>
                </div>
                <kbd className="px-2.5 py-1 rounded bg-muted text-[13px] text-foreground font-sans">Ctrl+G</kbd>
              </div>
            </div>
          </section>

          {/* ── Section 5: Download & Installation ────────────────────────── */}
          <section id="download" className="py-16 md:py-24">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Get Morsel
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Fast, signed installers built for Windows, macOS, and Linux.
              </p>
            </div>

            {/* Asymmetric Platform Breakdown */}
            <div className="mt-8 space-y-6 animate-morsel-enter">
              {/* Primary Windows Featured Block */}
              <div className="p-6 md:p-8 rounded-xl bg-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Windows 10 / 11 (x64)</h3>
                    <p className="mt-1 text-base text-muted-foreground">
                      Includes signed .msi installer and standalone portable executable.
                    </p>
                  </div>
                  <a
                    href="https://github.com/tomlin7/Morsel/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 px-5 text-sm font-medium transition-colors"
                  >
                    <DownloadIcon className="size-4" />
                    <span>Download for Windows (.msi)</span>
                  </a>
                </div>
              </div>

              {/* Secondary Multi-Platform Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-lg bg-muted/40 flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">macOS Universal</h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Apple Silicon (M1-M4) &amp; Intel. Notarized universal disk image (.dmg).
                    </p>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://github.com/tomlin7/Morsel/releases/latest"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline underline-offset-2"
                    >
                      <DownloadIcon className="size-3.5" />
                      <span>Download .dmg for macOS</span>
                    </a>
                  </div>
                </div>

                <div className="p-5 rounded-lg bg-muted/40 flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Linux x64</h4>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      AppImage and Debian package (.deb) for Ubuntu, Debian, Fedora, and Arch.
                    </p>
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://github.com/tomlin7/Morsel/releases/latest"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline underline-offset-2"
                    >
                      <DownloadIcon className="size-3.5" />
                      <span>Download AppImage / .deb</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* CLI Quick Install */}
            <div className="mt-10 p-5 rounded-lg bg-card animate-morsel-enter">
              <div className="text-sm font-medium text-foreground">Command Line Installation</div>
              <div className="mt-1 text-[13px] text-muted-foreground">Install directly into your user path via package scripts:</div>

              <div className="mt-4 flex items-center gap-2 pb-2 text-[13px]">
                <button
                  type="button"
                  onClick={() => setActiveInstallTab("powershell")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeInstallTab === "powershell" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  PowerShell
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInstallTab("sh")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeInstallTab === "sh" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  POSIX Shell (macOS / Linux)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInstallTab("cargo")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeInstallTab === "cargo" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rust Cargo
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 p-2.5 text-[13px] text-muted-foreground">
                <code>{getCliCommand()}</code>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy CLI command"
                >
                  {copiedCli ? <CheckIcon className="size-3.5 text-emerald-400" /> : <CopyIcon className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-8 text-[13px] text-muted-foreground flex flex-wrap items-center justify-between gap-2 animate-morsel-enter">
              <span>All builds cryptographically signed and verifiable on GitHub Releases. Current release: v1.220.0.</span>
              <a
                href="https://github.com/tomlin7/Morsel/releases"
                target="_blank"
                rel="noreferrer"
                className="text-foreground hover:underline underline-offset-2"
              >
                View All Releases &amp; Checksums &rarr;
              </a>
            </div>
          </section>

          {/* ── Section 6: Release Notes Preview ─────────────────────────── */}
          <section className="py-14 md:py-20 my-8 rounded-2xl bg-neutral-900/30 px-6 sm:px-10">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Latest release notes: v1.220.0
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Recent capabilities shipped in the active release cycle.
              </p>
            </div>

            <div className="mt-6 space-y-3 animate-morsel-enter">
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">Multi-Pane Split Grid:</span>
                <span className="text-muted-foreground ml-1.5">Full 2D editor area splitting with tab docking and drag handles.</span>
              </div>
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">Native Binary Hex Inspector:</span>
                <span className="text-muted-foreground ml-1.5">Inspect byte offsets, 16-byte hex chunks, and ASCII decoding side by side.</span>
              </div>
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">Columnar CSV/TSV Table Viewer:</span>
                <span className="text-muted-foreground ml-1.5">Interactive tabular data visualization with column sort and delimiter parsing.</span>
              </div>
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">Sub-100ms PTY Startup:</span>
                <span className="text-muted-foreground ml-1.5">Direct ConPTY process allocation via portable-pty with OSC 7 and OSC 133 shell integration.</span>
              </div>
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">Embedded PDF Documentation Reader:</span>
                <span className="text-muted-foreground ml-1.5">Integrated viewer for software manuals, schematics, and project specifications.</span>
              </div>
              <div className="p-4 rounded-lg bg-card text-[13px] leading-relaxed">
                <span className="font-semibold text-foreground">JSON Schema Validation &amp; Store:</span>
                <span className="text-muted-foreground ml-1.5">Automatic schema discovery and validation for manifest configurations.</span>
              </div>
            </div>
          </section>

          {/* ── Section 7: Questions / FAQ ─────────────────────────────────── */}
          <section id="faq" className="py-14 md:py-20 my-8 rounded-2xl bg-neutral-900/40 px-6 sm:px-10">
            <div className="animate-morsel-enter">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="mt-6 flex w-full max-w-2xl flex-col animate-morsel-enter">
              {faqs.map((faq, idx) => (
                <div key={faq.q} className="py-3.5">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="flex w-full items-start justify-between text-left text-base font-medium text-foreground hover:underline transition-colors"
                    >
                      <span>{faq.q}</span>
                      {openFaq === idx ? (
                        <ChevronUpIcon className="size-4 text-muted-foreground shrink-0 ml-4 mt-1" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-muted-foreground shrink-0 ml-4 mt-1" />
                      )}
                    </button>
                  </h3>
                  {openFaq === idx && (
                    <div className="mt-2.5 text-base text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between py-10 text-[13px] text-muted-foreground animate-morsel-enter">
          <div className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-[3px] bg-foreground text-background font-bold text-[9px]">
              M
            </span>
            <span>© 2026 Morsel. Maintained by Tomlin7.</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/tomlin7/Morsel"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/tomlin7/Morsel/releases"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Releases
            </a>
            <a
              href="https://github.com/tomlin7/Morsel/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              MIT License
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
