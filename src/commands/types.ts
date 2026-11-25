export type CommandContext = {
  openFolder: () => Promise<void> | void;
  cloneRepository: () => Promise<void> | void;
  openFolderAt: (path: string) => Promise<void> | void;
  openFile: (path: string) => Promise<void> | void;
  reopenClosed: () => Promise<void> | void;
  save: () => Promise<void> | void;
  saveAll: () => Promise<void> | void;
  closeActive: () => void;
  closeAll: () => void;
  toggleTheme: () => void;
  openPalette: () => void;
  openSymbols: () => void;
  closePalette: () => void;
  findInFile: () => void;
  runEditorCommand: (
    command:
      | "comment"
      | "wordWrap"
      | "relativeLines"
      | "goto"
      | "copyLineDown"
      | "moveLineUp"
      | "moveLineDown"
      | "replace",
  ) => void;
  openSearch: () => void;
  toggleTerminal: () => void;
  openProblems: () => void;
  toggleAi: () => void;
  openExtensions: () => void;
  openDebug: () => void;
  openSettings: () => void;
  toggleSidebar: () => void;
};

export type Command = {
  id: string;
  title: string;
  category?: string;
  keybinding?: string;
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
};

export function matchCommandQuery(title: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = title.toLowerCase();
  if (hay.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  return qi === q.length;
}
