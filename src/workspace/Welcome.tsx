import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { recentFiles, recentFolders } from "./history";
import { basename } from "./path";
import { useWorkspace } from "./WorkspaceContext";
import { appendLog } from "../logs/logBus";
import {
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Keyboard,
  Sparkles,
} from "lucide-react";
import "./Welcome.css";

type RecentItem = {
  id: string;
  kind: "folder" | "file";
  label: string;
  detail: string;
  run: () => void;
};

export function Welcome() {
  const { openFolder, openFolderAt, openFile, openUntitled } = useWorkspace();
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
        kind: "folder",
        label: basename(path),
        detail: path,
        run: () => void openFolderAt(path),
      });
    }
    for (const path of files) {
      items.push({
        id: `file:${path}`,
        kind: "file",
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
      <div className="welcome__hero">
        <div className="welcome__brand">
          <div className="welcome__logo">
            <Sparkles size={24} className="welcome__logo-icon" />
          </div>
          <div>
            <div className="welcome__title-row">
              <h1 className="welcome__title">T3D Editor</h1>
              <span className="welcome__version">v0.351</span>
            </div>
            <p className="welcome__subtitle">
              Fast, local-first code editor with integrated AI assistance
            </p>
          </div>
        </div>
      </div>

      <div className="welcome__grid">
        <section className="welcome__card">
          <h2 className="welcome__section-title">Start</h2>
          <div className="welcome__action-list">
            <button
              type="button"
              className="welcome__action-btn"
              onClick={openUntitled}
            >
              <FilePlus size={16} className="welcome__action-icon" />
              <div className="welcome__action-text">
                <span className="welcome__action-label">New File</span>
                <span className="welcome__action-desc">Open an untitled text document</span>
              </div>
              <span className="welcome__kbd">Ctrl+N</span>
            </button>

            <button
              type="button"
              className="welcome__action-btn"
              onClick={() => void openFolder()}
            >
              <FolderOpen size={16} className="welcome__action-icon" />
              <div className="welcome__action-text">
                <span className="welcome__action-label">Open Folder…</span>
                <span className="welcome__action-desc">Open an existing workspace folder</span>
              </div>
              <span className="welcome__kbd">Ctrl+O</span>
            </button>

            <button
              type="button"
              className="welcome__action-btn"
              onClick={() => void clone()}
            >
              <GitBranch size={16} className="welcome__action-icon" />
              <div className="welcome__action-text">
                <span className="welcome__action-label">Clone Repository…</span>
                <span className="welcome__action-desc">Clone a git repository to local disk</span>
              </div>
            </button>

            <button
              type="button"
              className="welcome__action-btn"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("t3d:keybindings"))
              }
            >
              <Keyboard size={16} className="welcome__action-icon" />
              <div className="welcome__action-text">
                <span className="welcome__action-label">Keyboard Shortcuts</span>
                <span className="welcome__action-desc">View and search key combinations</span>
              </div>
              <span className="welcome__kbd">Ctrl+K Ctrl+S</span>
            </button>
          </div>
        </section>

        <section className="welcome__card">
          <h2 className="welcome__section-title">Recent</h2>
          {recentItems.length > 0 ? (
            <ul
              ref={listRef}
              className="welcome__recent-list"
              role="listbox"
              aria-label="Recent folders and files"
              onKeyDown={onRecentKeyDown}
            >
              {recentItems.slice(0, 12).map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === focusIndex}
                    className={`welcome__recent-btn ${index === focusIndex ? "welcome__recent-btn--active" : ""}`}
                    onClick={() => item.run()}
                    onFocus={() => setFocusIndex(index)}
                  >
                    {item.kind === "folder" ? (
                      <Folder size={15} className="welcome__recent-icon welcome__recent-icon--folder" />
                    ) : (
                      <FileText size={15} className="welcome__recent-icon welcome__recent-icon--file" />
                    )}
                    <div className="welcome__recent-meta">
                      <span className="welcome__recent-name">{item.label}</span>
                      <span className="welcome__recent-path" title={item.detail}>
                        {item.detail}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="welcome__empty-recent">No recent files or folders yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
