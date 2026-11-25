import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { recentFiles, recentFolders } from "./history";
import { basename } from "./path";
import { useWorkspace } from "./WorkspaceContext";
import { appendLog } from "../logs/logBus";
import "./Welcome.css";

type RecentItem = {
  id: string;
  label: string;
  detail: string;
  run: () => void;
};

export function Welcome() {
  const { openFolder, openFolderAt, openFile } = useWorkspace();
  const folders = recentFolders();
  const files = recentFiles();
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

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

  const recentItems = useMemo((): RecentItem[] => {
    const items: RecentItem[] = [];
    for (const path of folders) {
      items.push({
        id: `folder:${path}`,
        label: basename(path),
        detail: path,
        run: () => void openFolderAt(path),
      });
    }
    for (const path of files) {
      items.push({
        id: `file:${path}`,
        label: basename(path),
        detail: path,
        run: () => void openFile(path),
      });
    }
    return items;
  }, [folders, files, openFolderAt, openFile]);

  useEffect(() => {
    setFocusIndex(0);
  }, [recentItems.length]);

  useEffect(() => {
    const button = listRef.current?.querySelectorAll("button")[focusIndex];
    button?.focus();
  }, [focusIndex]);

  const onRecentKeyDown = (event: KeyboardEvent) => {
    if (recentItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => (i + 1) % recentItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => (i - 1 + recentItems.length) % recentItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      recentItems[focusIndex]?.run();
    }
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
      <section className="welcome__tips">
        <p className="welcome__label">Tips</p>
        <ul className="welcome__tips-list">
          <li>
            <button type="button" onClick={() => void openFolder()}>
              Open a folder to start editing
            </button>
          </li>
          <li>
            <button type="button" onClick={() => void clone()}>
              Clone a git repository
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("t3d:keybindings"))
              }
            >
              Browse keyboard shortcuts
            </button>
          </li>
        </ul>
      </section>
      {recentItems.length > 0 ? (
        <section>
          <p className="welcome__label">Recent</p>
          <ul
            ref={listRef}
            className="welcome__list"
            role="listbox"
            aria-label="Recent folders and files"
            onKeyDown={onRecentKeyDown}
          >
            {recentItems.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === focusIndex}
                  className={
                    index === focusIndex ? "welcome__recent--active" : undefined
                  }
                  onClick={() => item.run()}
                  onFocus={() => setFocusIndex(index)}
                >
                  {item.label}
                  <span>{item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
