export type CommandContext = {
  openFolder: () => Promise<void> | void;
  addFolderRoot: () => Promise<void> | void;
  removeFolderRoot: (path: string) => Promise<void> | void;
  closeFolder: () => void;
  cloneRepository: () => Promise<void> | void;
  openFolderAt: (path: string) => Promise<void> | void;
  openGoToFile: () => void;
  openFile: (path: string) => Promise<void> | void;
  reopenClosed: () => Promise<void> | void;
  save: () => Promise<void> | void;
  saveAs: () => Promise<void> | void;
  saveAll: () => Promise<void> | void;
  closeActive: () => void;
  closeAll: () => void;
  closeOtherEditors: () => void;
  toggleTheme: () => void;
  toggleMinimap: () => void;
  openPalette: () => void;
  openSymbols: () => void;
  openWorkspaceSymbols: () => void;
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
      | "replace"
      | "peek"
      | "definition"
      | "references"
      | "rename"
      | "format"
      | "hover"
      | "addNextMatch"
      | "foldAll"
      | "unfoldAll"
      | "uppercase"
      | "lowercase"
      | "titlecase"
      | "blockComment"
      | "joinLines"
      | "sortLines"
      | "duplicateSelection"
      | "transposeLetters"
      | "jumpToBracket"
      | "selectHighlights"
      | "smartSelectExpand"
      | "smartSelectShrink",
  ) => void;
  revealActiveFile: () => void;
  openSearch: () => void;
  toggleTerminal: () => void;
  clearAllTerminals: () => void;
  runFile: () => void;
  openProblems: () => void;
  toggleAi: () => void;
  openExtensions: () => void;
  openDebug: () => void;
  openSettings: () => void;
  toggleSidebar: () => void;
  refreshExplorer: () => Promise<void> | void;
  collapseExplorer: () => void;
  expandExplorer: () => void;
  openKeybindings: () => void;
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
