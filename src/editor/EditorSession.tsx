import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  languageLabel,
  WELCOME_BUFFER_LANGUAGE,
  WELCOME_BUFFER_TITLE,
  WELCOME_BUFFER_VALUE,
} from "./welcomeBuffer";

export type EditorSession = {
  title: string;
  language: string;
  languageLabel: string;
  value: string;
  dirty: boolean;
  cursorLine: number;
  cursorColumn: number;
  setValue: (value: string) => void;
  setLanguage: (language: string) => void;
  setCursor: (line: number, column: number) => void;
  markSaved: () => void;
};

const EditorSessionContext = createContext<EditorSession | null>(null);

export function EditorSessionProvider({ children }: { children: ReactNode }) {
  const [title] = useState(WELCOME_BUFFER_TITLE);
  const [language, setLanguageState] = useState(WELCOME_BUFFER_LANGUAGE);
  const [value, setValueState] = useState(WELCOME_BUFFER_VALUE);
  const [baseline, setBaseline] = useState(WELCOME_BUFFER_VALUE);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);

  const setValue = useCallback((next: string) => {
    setValueState(next);
  }, []);

  const setLanguage = useCallback((next: string) => {
    setLanguageState(next);
  }, []);

  const setCursor = useCallback((line: number, column: number) => {
    setCursorLine(line);
    setCursorColumn(column);
  }, []);

  const markSaved = useCallback(() => {
    setBaseline(value);
  }, [value]);

  const session = useMemo<EditorSession>(
    () => ({
      title,
      language,
      languageLabel: languageLabel(language),
      value,
      dirty: value !== baseline,
      cursorLine,
      cursorColumn,
      setValue,
      setLanguage,
      setCursor,
      markSaved,
    }),
    [
      title,
      language,
      value,
      baseline,
      cursorLine,
      cursorColumn,
      setValue,
      setLanguage,
      setCursor,
      markSaved,
    ],
  );

  return (
    <EditorSessionContext.Provider value={session}>
      {children}
    </EditorSessionContext.Provider>
  );
}

export function useEditorSession(): EditorSession {
  const ctx = useContext(EditorSessionContext);
  if (!ctx) {
    throw new Error("useEditorSession must be used within EditorSessionProvider");
  }
  return ctx;
}
