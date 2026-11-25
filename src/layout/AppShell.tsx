import { useEffect } from "react";
import "./AppShell.css";
import { WorkspaceProvider, useWorkspace } from "../workspace/WorkspaceContext";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { StatusBar } from "./StatusBar";

function ShellChrome() {
  const { save } = useWorkspace();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-shell__workspace">
        <Sidebar />
        <EditorArea />
      </div>
      <StatusBar />
    </div>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ShellChrome />
    </WorkspaceProvider>
  );
}
