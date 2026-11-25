import "./AppShell.css";
import { Menubar } from "./Menubar";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { Panel } from "./Panel";
import { StatusBar } from "./StatusBar";

export function AppShell() {
  return (
    <div className="app-shell">
      <Menubar />
      <div className="app-shell__body">
        <ActivityBar />
        <Sidebar />
        <div className="app-shell__main">
          <EditorArea />
          <Panel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
