export type CommandContext = {
  openFolder: () => Promise<void> | void;
  addFolderRoot: () => Promise<void> | void;
  addActiveFolderRoot: () => Promise<void> | void;
  removeFolderRoot: (path: string) => Promise<void> | void;
  reopenRemovedRoot: () => Promise<void> | void;
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
  closeSavedEditors: () => void;
  pinActiveEditor: () => void;
  unpinActiveEditor: () => void;
  activeEditorPinned: boolean;
  copyActivePath: () => void;
  copyActiveRelativePath: () => void;
  toggleTheme: () => void;
  toggleMinimap: () => void;
  toggleStickyScroll: () => void;
  toggleWordWrap: () => void;
  toggleRenderWhitespace: () => void;
  toggleRelativeLineNumbers: () => void;
  toggleInsertFinalNewline: () => void;
  toggleTrimTrailingWhitespace: () => void;
  cycleAutoSave: () => void;
  cycleFontSize: () => void;
  cycleCursorStyle: () => void;
  cycleTabSize: () => void;
  cycleTerminalFontSize: () => void;
  toggleLineNumbers: () => void;
  openPalette: () => void;
  openSymbols: () => void;
  openWorkspaceSymbols: () => void;
  closePalette: () => void;
  findInFile: () => void;
  findInSelection: () => void;
  replaceInSelection: () => void;
  splitEditorRight: () => void;
  closeEditorGroup: () => void;
  runEditorCommand: (
    command:
      | "comment"
      | "wordWrap"
      | "relativeLines"
      | "goto"
      | "copyLineDown"
      | "copyLineUp"
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
  toggleBottomPanel: () => void;
  clearAllTerminals: () => void;
  clearActiveTerminal: () => void;
  newTerminal: () => void;
  killActiveTerminal: () => void;
  duplicateTerminal: () => void;
  focusNextTerminal: () => void;
  focusPreviousTerminal: () => void;
  renameActiveTerminal: () => void;
  restartActiveTerminal: () => void;
  runFile: () => void;
  openProblems: () => void;
  openLogs: () => void;
  toggleProblems: () => void;
  toggleScmAmend: () => void;
  toggleAi: () => void;
  openExtensions: () => void;
  openDebug: () => void;
  openSettings: () => void;
  toggleSidebar: () => void;
  refreshExplorer: () => Promise<void> | void;
  collapseExplorer: () => void;
  expandExplorer: () => void;
  openKeybindings: () => void;
  clearAiAttachments: () => void;
  clearAiChat: () => void;
  exportAiSession: () => void;
  importAiSession: () => void;
  newAiChat: () => void;
  showExplorer: () => void;
  showSearch: () => void;
  showScm: () => void;
  showOutline: () => void;
  reopenLastFolder: () => void;
  showWelcome: () => void;
  openAi: () => void;
  gitPull: () => void;
  gitPush: () => void;
  gitFetch: () => void;
  gitStash: () => void;
  gitStashPop: () => void;
  openUntitled: () => void;
  cycleProblemsFilter: () => void;
  focusActiveTerminal: () => void;
  duplicateEditorToSide: () => void;
  gitCreateBranch: () => void;
  gitCheckout: () => void;
  cycleRulers: () => void;
  cycleWordWrapColumn: () => void;
  clearLogs: () => void;
  revealActiveFileInOs: () => void;
  gitDiscardAll: () => void;
  gitStageAll: () => void;
  gitUnstageAll: () => void;
  cycleAiMaxToolRounds: () => void;
  revealActiveParentInExplorer: () => void;
  gitCopyRelativePaths: () => void;
  gitCopyAbsolutePaths: () => void;
  gitOpenSelected: () => void;
  cycleAiRequestTimeout: () => void;
  toggleAiStopOnToolError: () => void;
  gitSelectAll: () => void;
  gitDeselectAll: () => void;
  gitStageSelected: () => void;
  gitUnstageSelected: () => void;
  gitDiscardSelected: () => void;
  gitCopyBranch: () => void;
  cycleAiTemperature: () => void;
  toggleAiShowHistory: () => void;
  gitIgnoreSelected: () => void;
  gitCompareSelected: () => void;
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
