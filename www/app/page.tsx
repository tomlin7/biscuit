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

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function CommandIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  );
}

function HardDriveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
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

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Is this another Electron app?",
      a: "No. T3D uses Tauri 2 and compiled Rust on top of your operating system native webview runtime. It uses a fraction of the RAM of typical Electron editors and launches in under 100 milliseconds.",
    },
    {
      q: "How does the terminal differ from other editors?",
      a: "T3D spawns pseudoterminals directly through native Rust using portable-pty. Keystrokes, terminal resize events, and ANSI sequences bypass Node.js serialization completely, rendering directly into xterm with full OSC 7 and OSC 133 shell integration.",
    },
    {
      q: "Do extensions run in the main thread?",
      a: "No. Extensions execute in background Web Workers and sandboxed webviews with manifest permissions for network, clipboard, workspace, and scm. Heavy extension tasks cannot freeze Monaco typing pipeline or the editor interface.",
    },
    {
      q: "Where does my data live?",
      a: "Projects, sessions, configurations, and local logs live on your disk. No account, no telemetry, and no cloud between you and your machine.",
    },
    {
      q: "What is the release roadmap?",
      a: "T3D follows continuous progressive shipping. Version 1.212.0 is the active stable release, with milestone 1.213.0 and subsequent feature slices rolling out regularly.",
    },
  ];

  return (
    <div className="min-h-dvh antialiased bg-[#09090b] text-[#f4f4f5]">
      {/* ── Outer Waku Container (1100px with side borders) ─────────────── */}
      <div className="mx-auto w-full max-w-[1100px] border-zinc-800/70 md:border-x" data-ui="waku-frame">
        {/* ── Header (Waku layout) ───────────────────────────────────────── */}
        <header className="flex h-16 items-center justify-between px-5 md:px-10">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[6px] bg-white text-black font-bold text-xs tracking-tight">
              T3
            </span>
            <span className="text-[15px] font-semibold tracking-tight">T3D</span>
          </a>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/tomlin7/T3D"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="rounded-full text-zinc-400 transition-colors outline-none hover:text-white"
            >
              <GithubIcon className="size-6" />
            </a>
            <a
              href="#download"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 h-7 px-2.5 text-[0.8rem] font-medium transition-colors"
            >
              Download
            </a>
          </div>
        </header>

        <main id="main-content">
          {/* ── Section 0: Hero (Waku layout) ────────────────────────────── */}
          <section className="px-5 pt-14 pb-14 md:px-10 md:pt-24">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
              <span className="flex size-3.5 items-center justify-center rounded-[3px] bg-[#f26522] text-[10px] font-bold text-white">
                T
              </span>
              Not backed by Y Combinator
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-balance md:text-[3.4rem] md:leading-[1.04]">
              One native editor for speed, control, and zero bloat.
            </h1>

            <p className="mt-5 max-w-[36rem] text-[17px] leading-relaxed text-pretty text-zinc-400">
              T3D drives your workspace with compiled Rust, Monaco, and Tauri 2. Sessions, terminals, git diffs, and extensions in one fast graphite window, entirely on your machine.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#download"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 gap-1.5 h-10 px-4 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="size-4" />
                <span>Download v1.212.0</span>
              </a>

              <div className="text-xs text-zinc-400">
                <span>or run </span>
                <code className="text-zinc-200 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                  bun run tauri dev
                </code>
              </div>
            </div>

            <div className="mt-16">
              <div className="text-[11px] tracking-[0.14em] text-zinc-400 uppercase">
                Built for native desktop speed
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-4 text-xs text-zinc-300">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Tauri 2
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Compiled Rust
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Monaco Engine
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  portable-pty
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Sub-100ms startup
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Zero telemetry
                </span>
              </div>
            </div>
          </section>

          {/* ── Section 1: Interactive App Canvas (Waku layout) ──────────── */}
          <section className="border-t border-zinc-800/70" data-ui="waku-section">
            <div className="p-3 sm:p-6 bg-[#09090b]">
              <div data-ui="true">
                <TedDemo />
              </div>
            </div>
          </section>

          {/* ── Section 2: Why Native 6-Card Grid (Waku layout) ──────────── */}
          <section className="border-t border-zinc-800/70">
            <div className="px-5 pt-14 md:px-10">
              <div className="text-[11px] tracking-[0.14em] text-zinc-400 uppercase">
                Why native
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-px border-t border-zinc-800/70 bg-zinc-800/70 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <ZapIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Native down to the frame</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Rust and Tauri 2 runtime. Instant launch, smooth scrolling through years of files, and sub-100ms window creation without Electron.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <LayersIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Every symbol, real depth</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Monaco editor core with Code Lens reference counts, in-file symbol breadcrumbs, incoming and outgoing Call Hierarchy, and Type Hierarchy trees.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <TerminalIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Terminal with true PTY</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Direct process execution via portable-pty with zero Node IPC overhead. Supports PowerShell, Bash, and Zsh with live OSC 7 and OSC 133 shell integration.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <GitBranchIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Rewind that means it</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Built-in Git operations with side-by-side diff viewers, branch-to-branch comparisons, and one-click GitHub Pull Request creation.
                </p>
              </div>

              {/* Card 5 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <CommandIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Keyboard first</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Over 180 Command Palette actions, customizable shortcuts, Vim mode extension, and responsive multi-pane layout presets. Every control works without a mouse.
                </p>
              </div>

              {/* Card 6 */}
              <div className="bg-[#09090b] p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <HardDriveIcon className="size-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-white">Local by architecture</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Projects, sessions, configurations, and logs live on your disk. No account, zero telemetry, and no cloud between you and your machine.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 3: Download Section (Waku layout) ────────────────── */}
          <section id="download" className="border-t border-zinc-800/70 px-5 py-16 md:px-10 md:py-20" data-ui="waku-section">
            <div className="text-[11px] tracking-[0.14em] text-zinc-400 uppercase">
              Download
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Get T3D
            </h2>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/tomlin7/T3D/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 gap-1.5 h-10 px-4 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="size-4" />
                <span>Download for Windows (.exe)</span>
              </a>

              <a
                href="https://github.com/tomlin7/T3D/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 gap-1.5 h-10 px-4 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="size-4" />
                <span>macOS Universal (.dmg)</span>
              </a>

              <a
                href="https://github.com/tomlin7/T3D/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 gap-1.5 h-10 px-4 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="size-4" />
                <span>Linux (.AppImage / .deb)</span>
              </a>
            </div>

            <div className="mt-8 text-xs text-zinc-500">
              <span>All builds signed and verifiable on </span>
              <a
                href="https://github.com/tomlin7/T3D/releases"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-white underline underline-offset-2"
              >
                GitHub Releases
              </a>
              <span>. Current version: v1.212.0.</span>
            </div>
          </section>

          {/* ── Section 4: Questions (Waku layout) ───────────────────────── */}
          <section className="border-t border-zinc-800/70 px-5 py-16 md:px-10" data-ui="waku-section">
            <div className="text-[11px] tracking-[0.14em] text-zinc-400 uppercase">
              Questions
            </div>

            <div className="flex w-full flex-col mt-6 max-w-2xl">
              {faqs.map((faq, idx) => (
                <div key={faq.q} className="border-b border-zinc-800/60 py-3" data-ui="faq-item">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="flex w-full items-start justify-between text-left text-[15px] font-medium text-white hover:underline transition-colors"
                    >
                      <span>{faq.q}</span>
                      {openFaq === idx ? (
                        <ChevronUpIcon className="size-4 text-zinc-400 shrink-0 ml-4 mt-1" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-zinc-400 shrink-0 ml-4 mt-1" />
                      )}
                    </button>
                  </h3>
                  {openFaq === idx && (
                    <div className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ── Footer (Waku layout) ───────────────────────────────────────── */}
        <footer className="flex items-center justify-between border-t border-zinc-800/70 px-5 py-10 text-xs text-zinc-400 md:px-10" data-ui="waku-footer">
          <div className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-[3px] bg-white text-black font-bold text-[9px]">
              T3
            </span>
            <span>© 2026 T3D</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/tomlin7/T3D"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/tomlin7/T3D/releases"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Releases
            </a>
            <a
              href="https://github.com/tomlin7/T3D/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              MIT License
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
