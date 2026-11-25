import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type EditorHandle = {
  trigger: (action: string) => void;
  updateOptions: (options: {
    wordWrap?: "on" | "off";
    lineNumbers?: "on" | "relative";
  }) => void;
};

export type EditorCommand =
  | "comment"
  | "wordWrap"
  | "relativeLines"
  | "goto"
  | "copyLineDown"
  | "moveLineUp"
  | "moveLineDown"
  | "replace";

type EditorActionsState = {
  registerFindHandler: (handler: (() => void) | null) => void;
  registerEditor: (handle: EditorHandle | null) => void;
  findInFile: () => void;
  runEditorCommand: (command: EditorCommand) => void;
};

const EditorActionsContext = createContext<EditorActionsState | null>(null);

export function EditorActionsProvider({ children }: { children: ReactNode }) {
  const findHandler = useRef<(() => void) | null>(null);
  const editorHandle = useRef<EditorHandle | null>(null);
  const wordWrap = useRef<"on" | "off">("off");
  const lineNumbers = useRef<"on" | "relative">("on");

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
    () => ({ registerFindHandler, registerEditor, findInFile, runEditorCommand }),
    [registerFindHandler, registerEditor, findInFile, runEditorCommand],
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
