import type { Command } from "./types";

export const COMMANDS: Command[] = [
  {
    id: "workbench.action.showCommands",
    title: "Show All Commands",
    category: "View",
    keybinding: "Ctrl+Shift+P",
    run: (ctx) => ctx.openPalette(),
  },
  {
    id: "workbench.action.files.openFolder",
    title: "Open Folder…",
    category: "File",
    keybinding: "Ctrl+K Ctrl+O",
    run: (ctx) => void ctx.openFolder(),
  },
  {
    id: "workbench.action.files.save",
    title: "Save",
    category: "File",
    keybinding: "Ctrl+S",
    run: (ctx) => void ctx.save(),
  },
  {
    id: "workbench.action.closeActiveEditor",
    title: "Close Editor",
    category: "View",
    keybinding: "Ctrl+W",
    run: (ctx) => ctx.closeActive(),
  },
  {
    id: "workbench.action.toggleTheme",
    title: "Toggle Light/Dark Theme",
    category: "Preferences",
    keybinding: "Ctrl+K Ctrl+T",
    run: (ctx) => ctx.toggleTheme(),
  },
  {
    id: "actions.find",
    title: "Find in File",
    category: "Edit",
    keybinding: "Ctrl+F",
    run: (ctx) => ctx.findInFile(),
  },
  {
    id: "workbench.action.findInFiles",
    title: "Search in Workspace",
    category: "Edit",
    keybinding: "Ctrl+Shift+F",
    run: (ctx) => ctx.openSearch(),
  },
];
