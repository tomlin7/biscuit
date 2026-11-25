import { useEffect, useState } from "react";
import { Columns2, Rows2, X } from "lucide-react";
import { closeDiffTab, subscribeDiff } from "./diffBus";
import { IconButton } from "../ui/IconButton";
import "./DiffView.css";

type DiffState = {
  path: string;
  text: string;
  head?: string | null;
  working?: string | null;
};

export function useDiffTab() {
  const [diff, setDiff] = useState<DiffState | null>(null);
  useEffect(() => subscribeDiff(setDiff), []);
  return diff;
}

export function DiffView({ path, text, head, working }: DiffState) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const canSplit = head != null || working != null;
  const left = head ?? "(not in HEAD)";
  const right = working ?? "(no working tree copy)";
  const lines = (text || "(no changes)").split("\n");

  return (
    <div className="diff-view">
      <div className="diff-view__bar">
        <span>Diff — {path}</span>
        <span className="diff-view__bar-actions">
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
