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
  | "moveLineUp"
  | "moveLineDown"
  | "replace"
  | "peek"
  | "definition"
  | "references"
  | "rename"
  | "format";

type EditorActionsState = {
  registerFindHandler: (handler: (() => void) | null) => void;
  registerEditor: (handle: EditorHandle | null) => void;
  findInFile: () => void;
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

  const registerEditor = useCallback((handle: EditorHandle | null) => {
    editorHandle.current = handle;
  }, []);

  const findInFile = useCallback(() => {
    findHandler.current?.();
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
      registerEditor,
      findInFile,
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
      registerEditor,
      findInFile,
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
