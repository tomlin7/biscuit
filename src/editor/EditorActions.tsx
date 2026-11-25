import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type EditorActionsState = {
  registerFindHandler: (handler: (() => void) | null) => void;
  findInFile: () => void;
};

const EditorActionsContext = createContext<EditorActionsState | null>(null);

export function EditorActionsProvider({ children }: { children: ReactNode }) {
  const findHandler = useRef<(() => void) | null>(null);

  const registerFindHandler = useCallback((handler: (() => void) | null) => {
    findHandler.current = handler;
  }, []);

  const findInFile = useCallback(() => {
    findHandler.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerFindHandler, findInFile }),
    [registerFindHandler, findInFile],
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
