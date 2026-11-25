import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { recentFiles, recentFolders } from "./history";
import { basename } from "./path";
import { useWorkspace } from "./WorkspaceContext";
import { appendLog } from "../logs/logBus";
import "./Welcome.css";

export function Welcome() {
  const { openFolder, openFolderAt, openFile } = useWorkspace();
  const folders = recentFolders();
  const files = recentFiles();

  const clone = async () => {
    const url = window.prompt("Repository URL");
    if (!url?.trim()) return;
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Clone into folder",
    });
    if (selected === null || Array.isArray(selected)) return;
    const dest = await invoke<string>("git_clone", { url: url.trim(), parent: selected });
    appendLog(`Cloned repository into ${dest}`);
    await openFolderAt(dest);
  };

  return (
    <div className="welcome">
      <h2>T3D</h2>
      <div className="welcome__actions">
        <button type="button" onClick={() => void openFolder()}>
          Open Folder
        </button>
        <button type="button" onClick={() => void clone()}>
          Clone Repository
        </button>
      </div>
      {folders.length > 0 ? (
        <section>
          <p className="welcome__label">Recent folders</p>
          <ul className="welcome__list">
            {folders.map((path) => (
              <li key={path}>
                <button type="button" onClick={() => void openFolderAt(path)}>
                  {basename(path)}
                  <span>{path}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {files.length > 0 ? (
        <section>
          <p className="welcome__label">Recent files</p>
          <ul className="welcome__list">
            {files.map((path) => (
              <li key={path}>
                <button type="button" onClick={() => void openFile(path)}>
                  {basename(path)}
                  <span>{path}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
