import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as monaco from "monaco-editor";
import { keepMarker } from "./markerFilter";

export type ProblemItem = {
  id: string;
  path: string;
  message: string;
  severity: "error" | "warning" | "info" | "hint";
  line: number;
  column: number;
};

type DiagnosticsState = {
  problems: ProblemItem[];
  refresh: () => void;
};

const DiagnosticsContext = createContext<DiagnosticsState | null>(null);

function severityOf(
  severity: monaco.MarkerSeverity,
): ProblemItem["severity"] {
  if (severity === monaco.MarkerSeverity.Error) return "error";
  if (severity === monaco.MarkerSeverity.Warning) return "warning";
  if (severity === monaco.MarkerSeverity.Info) return "info";
  return "hint";
}

function collectProblems(): ProblemItem[] {
  const models = monaco.editor.getModels();
  const items: ProblemItem[] = [];
  for (const model of models) {
    const language = model.getLanguageId();
    const uri = model.uri.toString();
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    for (const marker of markers) {
      if (!keepMarker(language, marker.owner)) continue;
      items.push({
        id: `${uri}:${marker.startLineNumber}:${marker.startColumn}:${marker.message}`,
        path: model.uri.scheme === "file" ? model.uri.fsPath : uri,
        message: marker.message,
        severity: severityOf(marker.severity),
        line: marker.startLineNumber,
        column: marker.startColumn,
      });
    }
  }
  return items;
}

export function DiagnosticsProvider({ children }: { children: ReactNode }) {
  const [problems, setProblems] = useState<ProblemItem[]>([]);

  const refresh = useCallback(() => {
    setProblems(collectProblems());
  }, []);

  useEffect(() => {
    refresh();
    const sub = monaco.editor.onDidChangeMarkers(() => {
      refresh();
    });
    return () => sub.dispose();
  }, [refresh]);

  const value = useMemo(
    () => ({ problems, refresh }),
    [problems, refresh],
  );

  return (
    <DiagnosticsContext.Provider value={value}>
      {children}
    </DiagnosticsContext.Provider>
  );
}

export function useDiagnostics(): DiagnosticsState {
  const ctx = useContext(DiagnosticsContext);
  if (!ctx) {
    throw new Error("useDiagnostics must be used within DiagnosticsProvider");
  }
  return ctx;
}
