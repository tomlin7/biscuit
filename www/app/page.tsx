"use client";

import { useState } from "react";
import Link from "next/link";
import TedDemo from "@/components/TedDemo";

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="inline-block shrink-0">
      <path d="M2.5 6h7M6.5 2.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Page() {
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const quickstartCmd = "git clone https://github.com/tomlin7/T3D.git && cd T3D && bun install && bun run tauri dev";

  const handleCopy = () => {
    void navigator.clipboard.writeText(quickstartCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-[#f4f4f5] antialiased selection:bg-[#2563eb] selection:text-white">
      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0c]/90 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex size-7 items-center justify-center rounded-sm bg-white text-black font-bold text-xs tracking-tight">
                T3
              </span>
              <span className="text-base font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                T3D
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                v0.467.0
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
              <a href="#milestones" className="hover:text-white transition-colors">Milestones</a>
              <a href="#quickstart" className="hover:text-white transition-colors">Quickstart</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/tomlin7/T3D"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-[background-color,color] duration-150 active:scale-[0.96]"
            >
              <GithubIcon />
              <span>GitHub</span>
            </a>
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-white hover:bg-zinc-200 text-xs font-semibold text-black transition-[background-color,transform] duration-150 active:scale-[0.96]"
            >
              <span>Run T3D</span>
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
          <div className="md:hidden pt-4 pb-2 px-2 flex flex-col gap-3 text-sm text-zinc-300">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1">Features</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="py-1">Architecture</a>
            <a href="#milestones" onClick={() => setMobileMenuOpen(false)} className="py-1">Milestones</a>
            <a href="#quickstart" onClick={() => setMobileMenuOpen(false)} className="py-1">Quickstart</a>
            <a href="https://github.com/tomlin7/T3D" target="_blank" rel="noreferrer" className="py-1 flex items-center gap-2">
              <GithubIcon />
              <span>GitHub Repository</span>
            </a>
          </div>
        )}
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <header className="pt-16 pb-12 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-tight">
            The high-density desktop code editor.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Engineered with compiled Rust, Tauri 2, and Monaco. True island layout, native PTY terminal with shell integration, sandboxed webview extensions, and sub-100ms startup.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-sm bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.96]"
            >
              <span>Quickstart with Bun &amp; Tauri</span>
              <ArrowRightIcon />
            </a>
            <a
              href="https://github.com/tomlin7/T3D"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-[background-color,transform] duration-150 active:scale-[0.96]"
            >
              <GithubIcon />
              <span>View Source Code</span>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-400">
            <span>v0.467.0 release</span>
            <span>467 shipped milestones</span>
            <span>Sub-100ms cold startup</span>
            <span>Zero telemetry</span>
            <span>MIT License</span>
          </div>
        </div>
      </header>

      {/* ── Interactive Live Centerpiece ──────────────────────────────────── */}
      <section className="px-6 py-8" id="demo">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-black p-2 sm:p-4" data-ui="true">
            <TedDemo />
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Interactive preview: click tree files, switch bottom tabs, write code in the buffer, and test real editor commands.
          </p>
        </div>
      </section>

      {/* ── Core Technical Pillars ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#0f0f13]" id="features">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Built for speed and control.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Every system is written for density and responsiveness, avoiding the multi-gigabyte overhead and sluggish input pipelines of generic Electron editors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 */}
            <article className="rounded-lg bg-[#141418] p-8">
              <h3 className="text-xl font-semibold text-white">
                Compiled Rust PTY &amp; Terminal
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Direct process spawning via portable-pty with zero intermediate Node IPC lag. Supports PowerShell, Bash, Zsh, split side-by-side terminals, in-terminal scrollback search, clickable file:line coordinate navigation, and a built-in Process Explorer with process termination.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-zinc-300">
                <li>• OSC 7, OSC 633, and OSC 133 shell integration sequences</li>
                <li>• Live working directory tracking and command boundary jumps</li>
                <li>• Process Explorer monitoring terminal children with session killing</li>
              </ul>
            </article>

            {/* Pillar 2 */}
            <article className="rounded-lg bg-[#141418] p-8">
              <h3 className="text-xl font-semibold text-white">
                Monaco Editor &amp; Symbol Depth
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Full language intelligence tuned for instant keypress rendering. Features in-file symbol breadcrumb navigation, sticky outline pinned beside the minimap, incoming/outgoing Call Hierarchy views, recursive Type Hierarchy trees, inline inlay hints, and Code Lens reference counters.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-zinc-300">
                <li>• Code Lens reference counts above functions and classes</li>
                <li>• Inline parameter names and inferred types with inlay hints</li>
                <li>• Full vim mode support and 180+ Command Palette actions</li>
              </ul>
            </article>

            {/* Pillar 3 */}
            <article className="rounded-lg bg-[#141418] p-8">
              <h3 className="text-xl font-semibold text-white">
                Integrated Git &amp; Diff Engine
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Complete Git operations without external tools. Inspect dirty files, stage, unstage, amend, stash, and view side-by-side split diffs. Compare arbitrary branches and commit SHAs in the CompareView, and generate GitHub Pull Requests with one click.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-zinc-300">
                <li>• Side-by-side file tree and changed files diff viewer</li>
                <li>• Compare branches and commit histories directly in the editor</li>
                <li>• One-click GitHub PR creation targeting origin or upstream</li>
              </ul>
            </article>

            {/* Pillar 4 */}
            <article className="rounded-lg bg-[#141418] p-8">
              <h3 className="text-xl font-semibold text-white">
                Sandboxed Webview Extension Host
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Manifest-first architecture mirroring the VS Code web model. A shared background Web Worker loads extensions via async RPC. Webviews run in isolated iframes under the t3dext protocol with fine-grained manifest permissions for network, clipboard, workspace, and scm.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-zinc-300">
                <li>• Contributed webviews and sidebar panels via manifests</li>
                <li>• Permission security model and per-workspace disabling</li>
                <li>• Built-in Extension Marketplace for install, updates, and packaging</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ── Architecture Layers ───────────────────────────────────────────── */}
      <section className="py-20 px-6" id="architecture">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              The four architectural layers.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Clean separation between native system capabilities, isolated UI islands, and editing surfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-lg bg-zinc-950 p-6">
              <span className="text-xs font-semibold text-blue-400">Layer 1</span>
              <h3 className="mt-2 text-lg font-semibold text-white">Tauri 2 Shell</h3>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                Native system webview runtime, fine-grained capability gates, native window controls, and low binary footprint.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-950 p-6">
              <span className="text-xs font-semibold text-blue-400">Layer 2</span>
              <h3 className="mt-2 text-lg font-semibold text-white">Compiled Rust Core</h3>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                Direct portable-pty process spawning, file system watchers, git commands, and desktop notifications.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-950 p-6">
              <span className="text-xs font-semibold text-blue-400">Layer 3</span>
              <h3 className="mt-2 text-lg font-semibold text-white">React 19 Island UI</h3>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                Independent island containers for titlebar, sidebar, editor, and bottom drawer. Monaco never re-renders on layout resize.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-950 p-6">
              <span className="text-xs font-semibold text-blue-400">Layer 4</span>
              <h3 className="mt-2 text-lg font-semibold text-white">Monaco Editor</h3>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                Industrial editor buffer, syntax tree parsers, Code Lens, inlay hints, breadcrumbs, and modal keybindings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Milestones & Track Record ─────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#0f0f13]" id="milestones">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              467 milestones, shipped progressively.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              T3D is developed with strict progressive shipping. Every milestone is a concrete, tested capability locked across Rust, Tauri, React, and package versions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.467.0</div>
              <div className="mt-1 font-semibold text-white">Code Lens Reference Counts</div>
              <p className="mt-1.5 text-xs text-zinc-400">Reference counters and implementation badges directly above JS/TS declarations.</p>
            </div>

            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.466.0</div>
              <div className="mt-1 font-semibold text-white">Inlay Hints for Parameters &amp; Types</div>
              <p className="mt-1.5 text-xs text-zinc-400">Inline function parameter labels and inferred variable types inside editor buffers.</p>
            </div>

            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.465.0</div>
              <div className="mt-1 font-semibold text-white">Type Hierarchy Tree View</div>
              <p className="mt-1.5 text-xs text-zinc-400">Recursive supertypes and subtypes exploration for interfaces and classes.</p>
            </div>

            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.464.0</div>
              <div className="mt-1 font-semibold text-white">Call Hierarchy Navigation</div>
              <p className="mt-1.5 text-xs text-zinc-400">Expandable incoming caller and outgoing callee trees for functions and methods.</p>
            </div>

            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.463.0</div>
              <div className="mt-1 font-semibold text-white">Sticky Condensed Outline</div>
              <p className="mt-1.5 text-xs text-zinc-400">Real-time symbol outline docked beside minimap with active scope highlighting.</p>
            </div>

            <div className="rounded-lg bg-[#141418] p-5">
              <div className="text-xs text-zinc-500">v0.461.0</div>
              <div className="mt-1 font-semibold text-white">Compare Branches &amp; Commits Diff</div>
              <p className="mt-1.5 text-xs text-zinc-400">Unified CompareView with side-by-side file tree and changed files diff viewer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quickstart Section ────────────────────────────────────────────── */}
      <section className="py-20 px-6" id="quickstart">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Run T3D locally in seconds.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Requires Bun and the Rust toolchain installed on your system.
          </p>

          <div className="mt-8 rounded-lg bg-zinc-950 p-6 text-left text-xs space-y-3">
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
              <div className="text-zinc-500 pt-2"># 2. Enter project directory &amp; install dependencies</div>
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.96]"
            >
              <GithubIcon />
              <span>Explore GitHub Repository</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 bg-[#0a0a0c]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex size-5 items-center justify-center rounded-sm bg-white text-black font-bold text-[10px]">
              T3
            </span>
            <span className="text-zinc-200 font-semibold">T3D</span>
            <span>•</span>
            <span>Successor architecture to Biscuit</span>
            <span>•</span>
            <span>MIT License</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">Architecture</a>
            <a href="#milestones" className="hover:text-zinc-200 transition-colors">Milestones</a>
            <a href="#quickstart" className="hover:text-zinc-200 transition-colors">Quickstart</a>
            <a href="https://github.com/tomlin7/T3D" target="_blank" rel="noreferrer" className="hover:text-zinc-200 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
