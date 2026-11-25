export type CommandContext = {
  openFolder: () => Promise<void> | void;
  save: () => Promise<void> | void;
  closeActive: () => void;
  toggleTheme: () => void;
  openPalette: () => void;
  closePalette: () => void;
  findInFile: () => void;
  openSearch: () => void;
  toggleTerminal: () => void;
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
