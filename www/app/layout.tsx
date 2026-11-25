import type { Metadata } from "next";
import { Inter, Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "T3D — The Fast, Focused Code Editor",
  description:
    "High-density desktop code editor built on Tauri 2, compiled Rust PTY engine, Monaco, and React 19. Offline-first, sandboxed extensions, zero bloat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
