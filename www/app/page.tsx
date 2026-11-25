"use client";

import { useState } from "react";
import Link from "next/link";
import TedDemo from "@/components/TedDemo";

function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="inline-block shrink-0" aria-hidden="true">
      <path d="M2.5 6h7M6.5 2.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export default function Page() {
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const quickstartCmd = "git clone https://github.com/tomlin7/T3D.git && cd T3D && bun install && bun run tauri dev";

  const handleCopy = () => {
    void navigator.clipboard.writeText(quickstartCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Is T3D another Electron app?",
      a: "No. T3D uses Tauri 2 and compiled Rust on top of your operating system's native webview runtime. It uses a fraction of the RAM of typical Electron editors and launches in under 100 milliseconds.",
    },
    {
      q: "How does the terminal differ from other editors?",
      a: "T3D spawns pseudoterminals directly through native Rust using portable-pty. Keystrokes, terminal resize events, and ANSI sequences bypass Node.js serialization completely, rendering directly into xterm with full OSC 7 and OSC 133 shell integration.",
    },
    {
      q: "Do extensions run in the main thread?",
      a: "No. Extensions execute in background Web Workers and sandboxed webviews with manifest permissions for network, clipboard, workspace, and scm. Heavy extension tasks cannot freeze Monaco's typing pipeline or the editor interface.",
    },
    {
      q: "Does T3D collect analytics or phone home?",
      a: "No. T3D has zero telemetry, no user tracking, and no required accounts. All configuration, logs, and workspace state remain strictly on your local disk.",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-zinc-800 selection:text-white">
      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#09090b] px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex size-6 items-center justify-center rounded bg-white text-[#09090b] font-bold text-xs tracking-tight">
                T3
              </span>
              <span className="text-sm font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                T3D
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                v1.212.0
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
              <a href="#milestones" className="hover:text-white transition-colors">Milestones</a>
              <a href="#downloads" className="hover:text-white transition-colors">Downloads</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/tomlin7/T3D"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <GithubIcon />
              <span>GitHub</span>
            </a>
            <a
              href="#downloads"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-white hover:bg-zinc-200 text-xs font-semibold text-[#09090b] transition-colors"
            >
              <span>Download</span>
              <ArrowRightIcon />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex p-1.5 rounded text-zinc-400 hover:text-white"
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 px-2 flex flex-col gap-3 text-xs text-zinc-300 bg-zinc-900 mt-3 rounded p-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1">Features</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="py-1">Architecture</a>
            <a href="#milestones" onClick={() => setMobileMenuOpen(false)} className="py-1">Milestones</a>
            <a href="#downloads" onClick={() => setMobileMenuOpen(false)} className="py-1">Downloads</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">FAQ</a>
            <a href="https://github.com/tomlin7/T3D" target="_blank" rel="noreferrer" className="py-1 flex items-center gap-2">
              <GithubIcon />
              <span>GitHub Repository</span>
            </a>
          </div>
        )}
      </nav>

      <main id="main-content">
        {/* ── Hero Section ───────────────────────────────────────────────── */}
        <header className="pt-20 pb-16 px-6 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Version Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-xs text-zinc-300 mb-8">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Release v1.212.0 is live</span>
              <span className="text-zinc-600">·</span>
              <a href="#downloads" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
                Download binaries
              </a>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              One native editor for speed, control, and zero bloat.
            </h1>

            {/* Subhead */}
            <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              T3D pairs compiled Rust with Monaco and React 19 on Tauri 2. Direct PTY shell integration, instant split panes, and sandboxed extensions in a sub-100ms window.
            </p>

            {/* Primary Action Row */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
              <a
                href="#downloads"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-[#09090b] text-sm font-semibold transition-colors"
              >
                <span>Download T3D v1.212.0</span>
                <ArrowRightIcon />
              </a>

              {/* Quickstart Copy Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded bg-zinc-900 text-xs text-zinc-300">
                <TerminalIcon />
                <code>bun run tauri dev</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ml-1 inline-flex p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Copy quickstart command"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>

            {/* Micro Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-zinc-600" />
                Sub-100ms cold startup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-zinc-600" />
                Zero telemetry
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-zinc-600" />
                Compiled Rust PTY
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-zinc-600" />
                Sandboxed webviews
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-zinc-600" />
                MIT License
              </span>
            </div>
          </div>
        </header>

        {/* ── App Canvas Showcase ────────────────────────────────────────── */}
        <section className="px-6 pb-24" id="demo">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-xl bg-[#121215] p-2.5 sm:p-4">
              {/* Window Header Dots */}
              <div className="flex items-center justify-between pb-3 px-2 mb-3 bg-[#18181c] rounded-t p-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-3 text-xs text-zinc-400">T3D Editor preview</span>
                </div>
                <div className="text-xs text-zinc-500 hidden sm:block">
                  Tauri 2 · Monaco · portable-pty
                </div>
              </div>

              {/* Real Interactive Demo */}
              <div data-ui="true">
                <TedDemo />
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-zinc-400">
              Interactive preview: click files in the tree, toggle bottom drawer tabs, and test editor commands.
            </p>
          </div>
        </section>

        {/* ── Core Technical Features (Bento Grid) ───────────────────────── */}
        <section className="py-24 px-6 bg-[#0f0f12]" id="features">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-16">
              <span className="text-xs font-semibold text-zinc-400">Features</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Native down to the frame.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
                Built from the ground up for responsiveness, density, and local control. Eliminating the multi-gigabyte memory bloat and sluggish IPC pipelines of generic Electron editors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Feature 1 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4">
                    <TerminalIcon />
                  </div>
                  <h3 className="text-base font-semibold text-white">Compiled Rust PTY and Terminal</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Direct process execution via portable-pty with zero intermediate Node IPC lag. Supports PowerShell, Bash, and Zsh with live OSC 7 and OSC 133 shell integration.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• Live working directory tracking and command boundaries</li>
                  <li>• Split side-by-side terminals with in-scrollback search</li>
                  <li>• Process Explorer monitoring terminal children with kill action</li>
                </ul>
              </article>

              {/* Feature 2 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4 text-xs">
                    Symbols
                  </div>
                  <h3 className="text-base font-semibold text-white">Monaco with Real Symbol Depth</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Full language intelligence tuned for instant keypresses. Built with Code Lens reference counts, in-file symbol breadcrumbs, and sticky outline docked beside the minimap.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• Call Hierarchy view for incoming and outgoing callers</li>
                  <li>• Type Hierarchy tree for supertypes and subtypes</li>
                  <li>• Inlay parameter names and inferred variable types</li>
                </ul>
              </article>

              {/* Feature 3 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4">
                    <GithubIcon />
                  </div>
                  <h3 className="text-base font-semibold text-white">Built-in Git without Clutter</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Native source control without external CLI lag. Inspect dirty files, stage, unstage, commit, amend, stash, and compare arbitrary branches or commit SHAs.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• Unified CompareView with side-by-side diff viewer</li>
                  <li>• One-click GitHub PR creation targeting origin or upstream</li>
                  <li>• Local branch management and .gitignore integration</li>
                </ul>
              </article>

              {/* Feature 4 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4 text-xs font-semibold">
                    RPC
                  </div>
                  <h3 className="text-base font-semibold text-white">Sandboxed Extension Host</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Manifest-first architecture mirroring modern web extension runtimes. A shared background Web Worker executes extensions via asynchronous RPC.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• Contributed webviews running in isolated iframes</li>
                  <li>• Strict manifest permissions for network, clipboard, workspace, and scm</li>
                  <li>• Remote extension registry and packaging utilities</li>
                </ul>
              </article>

              {/* Feature 5 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4 text-xs font-semibold">
                    Local
                  </div>
                  <h3 className="text-base font-semibold text-white">Local by Architecture</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Completely offline-first with zero telemetry. Your project files, configuration, and git repositories stay on your physical machine.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• No mandatory sign-in or account creation</li>
                  <li>• Optional AI composer supporting local Ollama models</li>
                  <li>• Secure custom cloud API key storage</li>
                </ul>
              </article>

              {/* Feature 6 */}
              <article className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-zinc-800/80 flex items-center justify-center text-white mb-4 text-xs font-semibold">
                    Key
                  </div>
                  <h3 className="text-base font-semibold text-white">Keyboard First Workflow</h3>
                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                    Every operation is accessible without leaving the keyboard. Over 180 Command Palette actions, customizable shortcuts, and modal editing.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs text-zinc-300 pt-4 bg-[#111114] p-3 rounded">
                  <li>• Full vim mode support via first-party extension</li>
                  <li>• Quick file switching with fuzzy file navigation</li>
                  <li>• Reusable split layouts and editor presets</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* ── Architecture Layers ────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#09090b]" id="architecture">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-16">
              <span className="text-xs font-semibold text-zinc-400">Architecture</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                The four architectural layers.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
                Clean separation between native system capabilities, isolated UI islands, and editing surfaces.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg bg-[#121215] p-5">
                <span className="text-xs text-zinc-500 font-semibold">Layer 01</span>
                <h3 className="mt-2 text-sm font-semibold text-white">Tauri 2 Shell</h3>
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  Native webview runtime, fine-grained capability gates, native window chrome, and minimal binary footprint.
                </p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <span className="text-xs text-zinc-500 font-semibold">Layer 02</span>
                <h3 className="mt-2 text-sm font-semibold text-white">Compiled Rust Core</h3>
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  Direct portable-pty process spawning, filesystem watchers, git operations, and desktop notifications.
                </p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <span className="text-xs text-zinc-500 font-semibold">Layer 03</span>
                <h3 className="mt-2 text-sm font-semibold text-white">React 19 Island UI</h3>
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  Independent island containers for titlebar, sidebar, editor, and bottom drawer. Monaco never re-renders on resize.
                </p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <span className="text-xs text-zinc-500 font-semibold">Layer 04</span>
                <h3 className="mt-2 text-sm font-semibold text-white">Monaco Editor</h3>
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  Industrial editor buffer, syntax tree parsers, Code Lens, inlay hints, breadcrumbs, and modal keybindings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Downloads Section (Waku cards) ─────────────────────────────── */}
        <section className="py-24 px-6 bg-[#0f0f12]" id="downloads">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-14">
              <span className="text-xs font-semibold text-zinc-400">Downloads</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Install T3D for your desktop.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
                Official multi-platform binaries built on every release tag using GitHub Actions. Standalone, zero telemetry, offline-first.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Windows */}
              <div className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Windows</span>
                    <span className="text-[11px] text-zinc-500">x86_64</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">Windows Installer</h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Standard 64-bit NSIS executable setup or enterprise WiX installer package.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  <a
                    href="https://github.com/tomlin7/T3D/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white hover:bg-zinc-200 text-[#09090b] text-xs font-semibold transition-colors"
                  >
                    <span>Download .exe</span>
                    <ArrowRightIcon />
                  </a>
                  <a
                    href="https://github.com/tomlin7/T3D/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                  >
                    <span>.msi package</span>
                  </a>
                </div>
              </div>

              {/* macOS */}
              <div className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">macOS</span>
                    <span className="text-[11px] text-zinc-500">Universal</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">Apple Silicon and Intel</h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Single universal disk image running natively on both Apple Silicon (M1 to M4) and Intel Macs.
                  </p>
                </div>
                <div className="mt-8">
                  <a
                    href="https://github.com/tomlin7/T3D/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white hover:bg-zinc-200 text-[#09090b] text-xs font-semibold transition-colors"
                  >
                    <span>Download .dmg</span>
                    <ArrowRightIcon />
                  </a>
                </div>
              </div>

              {/* Linux */}
              <div className="rounded-lg bg-[#141418] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Linux</span>
                    <span className="text-[11px] text-zinc-500">amd64</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">AppImage and Debian</h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Zero-install standalone AppImage or Debian package for Ubuntu, Debian, and Linux Mint.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  <a
                    href="https://github.com/tomlin7/T3D/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white hover:bg-zinc-200 text-[#09090b] text-xs font-semibold transition-colors"
                  >
                    <span>.AppImage</span>
                    <ArrowRightIcon />
                  </a>
                  <a
                    href="https://github.com/tomlin7/T3D/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
                  >
                    <span>.deb package</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Milestones & Track Record ──────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#09090b]" id="milestones">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-semibold text-zinc-400">Milestones</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                467 milestones, shipped progressively.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
                T3D is developed with strict progressive shipping. Every milestone is a concrete, tested capability locked across Rust, Tauri, React, and package versions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v1.212.0</div>
                <div className="mt-1 font-semibold text-white">Code Lens and Multi-Platform Release</div>
                <p className="mt-1.5 text-xs text-zinc-400">Reference counters, inlay hints, and automated multi-platform release binaries.</p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v0.466.0</div>
                <div className="mt-1 font-semibold text-white">Inlay Hints for Parameters and Types</div>
                <p className="mt-1.5 text-xs text-zinc-400">Inline function parameter labels and inferred variable types inside editor buffers.</p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v0.465.0</div>
                <div className="mt-1 font-semibold text-white">Type Hierarchy Tree View</div>
                <p className="mt-1.5 text-xs text-zinc-400">Recursive supertypes and subtypes exploration for interfaces and classes.</p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v0.464.0</div>
                <div className="mt-1 font-semibold text-white">Call Hierarchy Navigation</div>
                <p className="mt-1.5 text-xs text-zinc-400">Expandable incoming caller and outgoing callee trees for functions and methods.</p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v0.463.0</div>
                <div className="mt-1 font-semibold text-white">Sticky Condensed Outline</div>
                <p className="mt-1.5 text-xs text-zinc-400">Real-time symbol outline docked beside minimap with active scope highlighting.</p>
              </div>

              <div className="rounded-lg bg-[#121215] p-5">
                <div className="text-xs text-zinc-500 font-semibold">v0.461.0</div>
                <div className="mt-1 font-semibold text-white">Compare Branches and Commits Diff</div>
                <p className="mt-1.5 text-xs text-zinc-400">Unified CompareView with side-by-side file tree and changed files diff viewer.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section (Waku style) ───────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#0f0f12]" id="faq">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold text-zinc-400">FAQ</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Frequently asked questions.
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={faq.q}
                  className="rounded-lg bg-[#141418] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-white hover:text-zinc-200 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-zinc-500 text-lg leading-none">
                      {openFaq === idx ? "−" : "+"}
                    </span>
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed bg-[#111114]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quickstart Section ─────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#09090b]" id="quickstart">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Run T3D locally in seconds.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
              Requires Bun and the Rust toolchain installed on your development system.
            </p>

            <div className="mt-8 rounded-lg bg-[#121215] p-6 text-left text-xs space-y-3">
              <div className="flex items-center justify-between text-zinc-500">
                <span>Terminal Setup</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span>{copied ? "Copied" : "Copy command"}</span>
                </button>
              </div>

              <div className="space-y-1.5 text-zinc-300">
                <div className="text-zinc-500"># 1. Clone the repository</div>
                <pre className="text-white"><code>git clone https://github.com/tomlin7/T3D.git</code></pre>
                <div className="text-zinc-500 pt-2"># 2. Enter project directory and install dependencies</div>
                <pre className="text-white"><code>cd T3D &amp;&amp; bun install</code></pre>
                <div className="text-zinc-500 pt-2"># 3. Launch native desktop application</div>
                <pre className="text-emerald-400 font-semibold"><code>bun run tauri dev</code></pre>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href="https://github.com/tomlin7/T3D"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-[#09090b] text-sm font-semibold transition-colors"
              >
                <GithubIcon />
                <span>Explore GitHub Repository</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 bg-[#070709]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex size-5 items-center justify-center rounded bg-white text-[#09090b] font-bold text-[10px]">
              T3
            </span>
            <span className="text-zinc-200 font-semibold">T3D</span>
            <span>·</span>
            <span>Successor architecture to Biscuit</span>
            <span>·</span>
            <span>MIT License</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">Architecture</a>
            <a href="#milestones" className="hover:text-zinc-200 transition-colors">Milestones</a>
            <a href="#downloads" className="hover:text-zinc-200 transition-colors">Downloads</a>
            <a href="#faq" className="hover:text-zinc-200 transition-colors">FAQ</a>
            <a href="https://github.com/tomlin7/T3D" target="_blank" rel="noreferrer" className="hover:text-zinc-200 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
