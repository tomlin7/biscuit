import "./AppShell.css";
import { EditorSessionProvider } from "../editor/EditorSession";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { AiPanel } from "./AiPanel";
import { StatusBar } from "./StatusBar";

export function AppShell() {
  return (
    <EditorSessionProvider>
      <div className="app-shell">
        <TitleBar />
        <div className="app-shell__workspace">
          <Sidebar />
          <EditorArea />
          <AiPanel />
        </div>
        <StatusBar />
      </div>
    </EditorSessionProvider>
  );
}
