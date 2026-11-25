import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ReferenceHit = {
  path: string;
  line: number;
  column: number;
  preview: string;
};

export type PeekInfo = {
  title: string;
  preview: string;
  path: string;
  line: number;
  column: number;
};

type EditorHandle = {
  trigger: (action: string) => void;
  updateOptions: (options: {
    wordWrap?: "on" | "off";
    lineNumbers?: "on" | "relative";
  }) => void;
  lookupDefinition?: (jump: boolean) => void;
  findReferences?: () => void;
  renameSymbol?: () => void;
};

export type EditorCommand =
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
  | "smartSelectShrink";

type EditorActionsState = {
  registerFindHandler: (handler: (() => void) | null) => void;
  registerFindInSelectionHandler: (handler: (() => void) | null) => void;
  registerReplaceInSelectionHandler: (handler: (() => void) | null) => void;
  registerEditor: (handle: EditorHandle | null) => void;
  findInFile: () => void;
  findInSelection: () => void;
  replaceInSelection: () => void;
  findMatchLabel: string | null;
  setFindMatchLabel: (label: string | null) => void;
  runEditorCommand: (command: EditorCommand) => void;
  peek: PeekInfo | null;
  clearPeek: () => void;
  showPeek: (info: PeekInfo | null) => void;
  references: ReferenceHit[] | null;
  clearReferences: () => void;
  showReferences: (hits: ReferenceHit[] | null) => void;
};

const EditorActionsContext = createContext<EditorActionsState | null>(null);

export function EditorActionsProvider({ children }: { children: ReactNode }) {
  const findHandler = useRef<(() => void) | null>(null);
  const findInSelectionHandler = useRef<(() => void) | null>(null);
  const replaceInSelectionHandler = useRef<(() => void) | null>(null);
  const editorHandle = useRef<EditorHandle | null>(null);
  const wordWrap = useRef<"on" | "off">("off");
  const lineNumbers = useRef<"on" | "relative">("on");
  const [peek, setPeek] = useState<PeekInfo | null>(null);
  const [references, setReferences] = useState<ReferenceHit[] | null>(null);
  const [findMatchLabel, setFindMatchLabel] = useState<string | null>(null);
  const clearPeek = useCallback(() => setPeek(null), []);
  const clearReferences = useCallback(() => setReferences(null), []);

  const registerFindHandler = useCallback((handler: (() => void) | null) => {
    findHandler.current = handler;
  }, []);

  const registerFindInSelectionHandler = useCallback((handler: (() => void) | null) => {
    findInSelectionHandler.current = handler;
  }, []);

  const registerReplaceInSelectionHandler = useCallback((handler: (() => void) | null) => {
    replaceInSelectionHandler.current = handler;
  }, []);

  const registerEditor = useCallback((handle: EditorHandle | null) => {
    editorHandle.current = handle;
  }, []);

  const findInFile = useCallback(() => {
    findHandler.current?.();
  }, []);

  const findInSelection = useCallback(() => {
    findInSelectionHandler.current?.();
  }, []);

  const replaceInSelection = useCallback(() => {
    replaceInSelectionHandler.current?.();
  }, []);

  const runEditorCommand = useCallback((command: EditorCommand) => {
    const handle = editorHandle.current;
    if (!handle) return;
    switch (command) {
      case "comment":
        handle.trigger("editor.action.commentLine");
        break;
      case "goto":
        handle.trigger("editor.action.gotoLine");
        break;
      case "copyLineDown":
        handle.trigger("editor.action.copyLinesDownAction");
        break;
      case "copyLineUp":
        handle.trigger("editor.action.copyLinesUpAction");
        break;
      case "moveLineUp":
        handle.trigger("editor.action.moveLinesUpAction");
        break;
      case "moveLineDown":
        handle.trigger("editor.action.moveLinesDownAction");
        break;
      case "replace":
        handle.trigger("editor.action.startFindReplaceAction");
        break;
      case "peek":
        handle.lookupDefinition?.(false);
        break;
      case "definition":
        handle.lookupDefinition?.(true);
        break;
      case "references":
        handle.findReferences?.();
        break;
      case "rename":
        handle.renameSymbol?.();
        break;
      case "format":
        handle.trigger("editor.action.formatDocument");
        break;
      case "hover":
        handle.trigger("editor.action.showHover");
        break;
      case "addNextMatch":
        handle.trigger("editor.action.addSelectionToNextFindMatch");
        break;
      case "foldAll":
        handle.trigger("editor.foldAll");
        break;
      case "unfoldAll":
        handle.trigger("editor.unfoldAll");
        break;
      case "uppercase":
        handle.trigger("editor.action.transformToUppercase");
        break;
      case "lowercase":
        handle.trigger("editor.action.transformToLowercase");
        break;
      case "titlecase":
        handle.trigger("editor.action.transformToTitlecase");
        break;
      case "blockComment":
        handle.trigger("editor.action.blockComment");
        break;
      case "joinLines":
        handle.trigger("editor.action.joinLines");
        break;
      case "sortLines":
        handle.trigger("editor.action.sortLinesAscending");
        break;
      case "duplicateSelection":
        handle.trigger("editor.action.duplicateSelection");
        break;
      case "transposeLetters":
        handle.trigger("editor.action.transposeLetters");
        break;
      case "jumpToBracket":
        handle.trigger("editor.action.jumpToBracket");
        break;
      case "selectHighlights":
        handle.trigger("editor.action.selectHighlights");
        break;
      case "smartSelectExpand":
        handle.trigger("editor.action.smartSelect.expand");
        break;
      case "smartSelectShrink":
        handle.trigger("editor.action.smartSelect.shrink");
        break;
      case "wordWrap":
        wordWrap.current = wordWrap.current === "on" ? "off" : "on";
        handle.updateOptions({ wordWrap: wordWrap.current });
        break;
      case "relativeLines":
        lineNumbers.current = lineNumbers.current === "relative" ? "on" : "relative";
        handle.updateOptions({ lineNumbers: lineNumbers.current });
        break;
      default:
        break;
    }
  }, []);

  const value = useMemo(
    () => ({
      registerFindHandler,
      registerFindInSelectionHandler,
      registerReplaceInSelectionHandler,
      registerEditor,
      findInFile,
      findInSelection,
      replaceInSelection,
      findMatchLabel,
      setFindMatchLabel,
      runEditorCommand,
      peek,
      clearPeek,
      showPeek: setPeek,
      references,
      clearReferences,
      showReferences: setReferences,
    }),
    [
      registerFindHandler,
      registerFindInSelectionHandler,
      registerReplaceInSelectionHandler,
      registerEditor,
      findInFile,
      findInSelection,
      replaceInSelection,
      findMatchLabel,
      runEditorCommand,
      peek,
      clearPeek,
      references,
      clearReferences,
    ],
  );

  return (
    <EditorActionsContext.Provider value={value}>
      {children}
    </EditorActionsContext.Provider>
  );
}

export function useEditorActions(): EditorActionsState {
  const ctx = useContext(EditorActionsContext);
  if (!ctx) {
    throw new Error("useEditorActions must be used within EditorActionsProvider");
  }
  return ctx;
}
