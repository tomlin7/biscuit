import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Columns2, ExternalLink, Rows2, Space, X } from "lucide-react";
import { closeDiffTab, patchDiffTab, subscribeDiff } from "./diffBus";
import { writeIgnoreSpacePref } from "./diffPrefs";
import { IconButton } from "../ui/IconButton";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { basename, joinPath } from "../workspace/path";
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

type ParsedDiffLine = {
  kind: "add" | "del" | "hunk" | "plain";
  oldLine: number | null;
  newLine: number | null;
  text: string;
};

function parseDiff(text: string): ParsedDiffLine[] {
  const lines = (text || "(no changes)").split("\n");
  const result: ParsedDiffLine[] = [];
  let curOld = 0;
  let curNew = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
      if (match) {
        curOld = parseInt(match[1], 10);
        curNew = parseInt(match[2], 10);
      }
      result.push({ kind: "hunk", oldLine: null, newLine: null, text: line });
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      result.push({ kind: "add", oldLine: null, newLine: curNew, text: line });
      curNew++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      result.push({ kind: "del", oldLine: curOld, newLine: null, text: line });
      curOld++;
    } else {
      const isHeader =
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++");
      result.push({
        kind: "plain",
        oldLine: isHeader ? null : curOld,
        newLine: isHeader ? null : curNew,
        text: line,
      });
      if (!isHeader && line.length > 0) {
        curOld++;
        curNew++;
      }
    }
  }
  return result;
}

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
  const { openFile } = useWorkspace();
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const [loading, setLoading] = useState(false);
  const canSplit = head != null || working != null;
  const left = head ?? "(not in HEAD)";
  const right = working ?? "(no working tree copy)";

  const parsedLines = useMemo(() => parseDiff(text), [text]);

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

  const handleOpenFile = () => {
    const target = cwd ? joinPath(cwd, path) : path;
    void openFile(target);
  };

  const splitLeftLines = useMemo(() => left.split("\n"), [left]);
  const splitRightLines = useMemo(() => right.split("\n"), [right]);

  return (
    <div className="diff-view">
      <div className="diff-view__bar">
        <div className="diff-view__bar-title">
          <span
            className={`diff-view__badge ${staged ? "diff-view__badge--staged" : "diff-view__badge--working"}`}
          >
            {staged ? "Staged" : "Working Tree"}
          </span>
          <span className="diff-view__file-name">{basename(path)}</span>
          <span className="diff-view__path">{path}</span>
        </div>

        <div className="diff-view__bar-actions">
          <IconButton
            icon={ExternalLink}
            label="Open file in editor"
            size={14}
            onClick={handleOpenFile}
          />
          {cwd && (
            <IconButton
              icon={Space}
              label={ignoreSpace ? "Show whitespace changes" : "Ignore whitespace"}
              size={14}
              active={!!ignoreSpace}
              disabled={loading}
              onClick={toggleIgnoreSpace}
            />
          )}
          {canSplit && (
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
          )}
          <IconButton icon={X} label="Close diff" size={14} onClick={closeDiffTab} />
        </div>
      </div>

      {mode === "split" && canSplit ? (
        <div className="diff-view__split">
          <div className="diff-view__pane">
            <div className="diff-view__pane-header">
              <span className="diff-view__pane-tag">HEAD</span>
            </div>
            <div className="diff-view__pane-body">
              {splitLeftLines.map((line, idx) => (
                <div key={idx} className="diff-view__line-row">
                  <span className="diff-view__gutter">{idx + 1}</span>
                  <span className="diff-view__code">{line || " "}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="diff-view__pane">
            <div className="diff-view__pane-header">
              <span className="diff-view__pane-tag">Working Tree</span>
            </div>
            <div className="diff-view__pane-body">
              {splitRightLines.map((line, idx) => (
                <div key={idx} className="diff-view__line-row">
                  <span className="diff-view__gutter">{idx + 1}</span>
                  <span className="diff-view__code">{line || " "}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="diff-view__unified">
          {parsedLines.map((item, index) => (
            <div
              key={index}
              className={`diff-view__unified-line diff-view__unified-line--${item.kind}`}
            >
              <span className="diff-view__gutter diff-view__gutter--old">
                {item.oldLine ?? ""}
              </span>
              <span className="diff-view__gutter diff-view__gutter--new">
                {item.newLine ?? ""}
              </span>
              <span className="diff-view__code">{item.text || " "}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
