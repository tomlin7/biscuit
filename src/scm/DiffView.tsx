import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Columns2, Rows2, Space, X } from "lucide-react";
import { closeDiffTab, patchDiffTab, subscribeDiff } from "./diffBus";
import { writeIgnoreSpacePref } from "./diffPrefs";
import { IconButton } from "../ui/IconButton";
import "./DiffView.css";

type DiffState = {
  path: string;
  text: string;
  head?: string | null;
  working?: string | null;
  cwd?: string | null;
  staged?: boolean;
  ignoreSpace?: boolean;
};

export function useDiffTab() {
  const [diff, setDiff] = useState<DiffState | null>(null);
  useEffect(() => subscribeDiff(setDiff), []);
  return diff;
}

export function DiffView({
  path,
  text,
  head,
  working,
  cwd,
  staged,
  ignoreSpace,
}: DiffState) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const [loading, setLoading] = useState(false);
  const canSplit = head != null || working != null;
  const left = head ?? "(not in HEAD)";
  const right = working ?? "(no working tree copy)";
  const lines = (text || "(no changes)").split("\n");

  const toggleIgnoreSpace = () => {
    if (!cwd) return;
    const next = !ignoreSpace;
    setLoading(true);
    void invoke<string>("git_diff", {
      cwd,
      path,
      staged: staged ?? false,
      ignoreSpace: next,
    })
      .then((nextText) => {
        writeIgnoreSpacePref(next);
        patchDiffTab({ text: nextText, ignoreSpace: next });
      })
      .catch(() => {
        /* keep current text */
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="diff-view">
      <div className="diff-view__bar">
        <span>Diff — {path}</span>
        <span className="diff-view__bar-actions">
          {cwd ? (
            <IconButton
              icon={Space}
              label={ignoreSpace ? "Show whitespace changes" : "Ignore whitespace"}
              size={14}
              active={!!ignoreSpace}
              disabled={loading}
              onClick={toggleIgnoreSpace}
            />
          ) : null}
          {canSplit ? (
            <>
              <IconButton
                icon={Rows2}
                label="Unified diff"
                size={14}
                active={mode === "unified"}
                onClick={() => setMode("unified")}
              />
              <IconButton
                icon={Columns2}
                label="Side by side"
                size={14}
                active={mode === "split"}
                onClick={() => setMode("split")}
              />
            </>
          ) : null}
          <IconButton icon={X} label="Close diff" size={14} onClick={closeDiffTab} />
        </span>
      </div>
      {mode === "split" && canSplit ? (
        <div className="diff-view__split">
          <div className="diff-view__pane">
            <div className="diff-view__pane-label">HEAD</div>
            <pre className="diff-view__body">{left}</pre>
          </div>
          <div className="diff-view__pane">
            <div className="diff-view__pane-label">Working tree</div>
            <pre className="diff-view__body">{right}</pre>
          </div>
        </div>
      ) : (
        <pre className="diff-view__body">
          {lines.map((line, index) => {
            const kind =
              line.startsWith("+") && !line.startsWith("+++")
                ? "add"
                : line.startsWith("-") && !line.startsWith("---")
                  ? "del"
                  : line.startsWith("@@")
                    ? "hunk"
                    : "plain";
            return (
              <span key={index} className={`diff-view__line diff-view__line--${kind}`}>
                {line}
                {"\n"}
              </span>
            );
          })}
        </pre>
      )}
    </div>
  );
}
