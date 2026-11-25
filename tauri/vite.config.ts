import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const monacoEsm = path.resolve(rootDir, "node_modules/monaco-editor/esm/vs");

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  optimizeDeps: {
    include: ["monaco-editor", "monaco-vim"],
  },
  resolve: {
    dedupe: ["monaco-editor"],
    alias: [
      // monaco-vim deep-imports paths that monaco-editor's exports map does not expose.
      {
        find: /^monaco-editor\/esm\/vs\/(.*)$/,
        replacement: `${monacoEsm}/$1`,
      },
    ],
  },
  worker: {
    format: "es" as const,
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
