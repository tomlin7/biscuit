import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeftRight,
  ExternalLink,
  GitBranch,
  GitCommit,
  RefreshCw,
  X,
} from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { openDiffTab } from "./diffBus";
import { closeCompareTab, patchCompareTab } from "./compareBus";
import "./CompareView.css";

export type GitCommitEntry = {
  hash: string;
  author: string;
  relative_date: string;
  subject: string;
};

export type GitCompareFile = {
  path: string;
  status: string;
};

export type GitCompareSummary = {
  base: string;
  head: string;
  stat: string;
  commits: GitCommitEntry[];
  files: GitCompareFile[];
};

type Props = {
  base: string;
  head: string;
  cwd: string;
  onClose?: () => void;
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

export function CompareView({ base: initialBase, head: initialHead, cwd, onClose }: Props) {
  const [base, setBase] = useState(initialBase);
  const [head, setHead] = useState(initialHead);
  const [summary, setSummary] = useState<GitCompareSummary | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "commits">("files");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void invoke<string[]>("git_branches", { cwd })
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [cwd]);

  const loadCompare = useCallback(
    async (b: string, h: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await invoke<GitCompareSummary>("git_compare_refs", {
          cwd,
          base: b,
          head: h,
        });
        setSummary(res);
        if (res.files.length > 0) {
          const firstPath = res.files[0].path;
          setSelectedFile(firstPath);
          const diff = await invoke<string>("git_diff_refs", {
            cwd,
            base: b,
            head: h,
            path: firstPath,
          });
          setFileDiff(diff);
        } else {
          setSelectedFile(null);
          setFileDiff("No file differences.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [cwd],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (base.trim() && head.trim()) {
        void loadCompare(base.trim(), head.trim());
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [base, head, loadCompare]);

  const handleSelectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    try {
      const diff = await invoke<string>("git_diff_refs", {
        cwd,
        base,
        head,
        path: filePath,
      });
      setFileDiff(diff);
    } catch {
      setFileDiff("Failed to load diff for this file.");
    }
  };

  const handleSwap = () => {
    const nextBase = head;
    const nextHead = base;
    setBase(nextBase);
    setHead(nextHead);
    patchCompareTab({ base: nextBase, head: nextHead });
  };

  const handleOpenInDiffView = async () => {
    if (!selectedFile) return;
    const baseContent = await invoke<string>("git_show_ref", {
      cwd,
      ref: base,
      path: selectedFile,
    }).catch(() => null);
    const headContent = await invoke<string>("git_show_ref", {
      cwd,
      ref: head,
      path: selectedFile,
    }).catch(() => null);
    openDiffTab(selectedFile, fileDiff, {
      cwd,
      head: baseContent,
      working: headContent,
    });
    closeCompareTab();
  };

  const parsedLines = useMemo(() => parseDiff(fileDiff), [fileDiff]);

  return (
    <div className="compare-view">
      <div className="compare-view__header">
        <div className="compare-view__title">
          <GitBranch size={16} />
          <span>Compare Branches & Commits</span>
        </div>

        <div className="compare-view__controls">
          <div className="compare-view__ref-group">
            <label className="compare-view__label">Base:</label>
            <input
              className="compare-view__input"
              value={base}
              list="compare-branches-list"
              onChange={(e) => setBase(e.target.value)}
              placeholder="base ref (e.g. main)"
            />
          </div>

          <IconButton
            icon={ArrowLeftRight}
            label="Swap base and head"
            size={14}
            onClick={handleSwap}
          />

          <div className="compare-view__ref-group">
            <label className="compare-view__label">Compare:</label>
            <input
              className="compare-view__input"
              value={head}
              list="compare-branches-list"
              onChange={(e) => setHead(e.target.value)}
              placeholder="compare ref (e.g. HEAD)"
            />
          </div>

          <datalist id="compare-branches-list">
            {branches.map((br) => (
              <option key={br} value={br} />
            ))}
          </datalist>

          <IconButton
            icon={RefreshCw}
            label="Refresh comparison"
            size={14}
            onClick={() => void loadCompare(base, head)}
            disabled={loading}
          />

          <IconButton
            icon={X}
            label="Close compare view"
            size={14}
            onClick={() => {
              closeCompareTab();
              onClose?.();
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="compare-view__error">{error}</div>
      ) : summary ? (
        <div className="compare-view__body">
          <div className="compare-view__sidebar">
            <div className="compare-view__tabs">
              <button
                type="button"
                className={`compare-view__tab-btn ${activeTab === "files" ? "compare-view__tab-btn--active" : ""}`}
                onClick={() => setActiveTab("files")}
              >
                Changed Files ({summary.files.length})
              </button>
              <button
                type="button"
                className={`compare-view__tab-btn ${activeTab === "commits" ? "compare-view__tab-btn--active" : ""}`}
                onClick={() => setActiveTab("commits")}
              >
                Commits ({summary.commits.length})
              </button>
            </div>

            <div className="compare-view__stat">{summary.stat}</div>

            <div className="compare-view__list">
              {activeTab === "files" ? (
                summary.files.length === 0 ? (
                  <div className="compare-view__empty">No changed files.</div>
                ) : (
                  summary.files.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      className={`compare-view__file-item ${selectedFile === f.path ? "compare-view__file-item--active" : ""}`}
                      onClick={() => void handleSelectFile(f.path)}
                    >
                      <span className={`compare-view__file-status compare-view__file-status--${f.status.toLowerCase()}`}>
                        {f.status}
                      </span>
                      <span className="compare-view__file-path" title={f.path}>
                        {f.path}
                      </span>
                    </button>
                  ))
                )
              ) : summary.commits.length === 0 ? (
                <div className="compare-view__empty">No commits between {base} and {head}.</div>
              ) : (
                summary.commits.map((c) => (
                  <div key={String(c.hash)} className="compare-view__commit-item">
                    <div className="compare-view__commit-top">
                      <GitCommit size={13} />
                      <span className="compare-view__commit-hash">{String(c.hash)}</span>
                      <span className="compare-view__commit-date">{c.relative_date}</span>
                    </div>
                    <div className="compare-view__commit-subject">{c.subject}</div>
                    <div className="compare-view__commit-author">{c.author}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="compare-view__diff-pane">
            <div className="compare-view__diff-header">
              <span className="compare-view__diff-title">
                {selectedFile ? (
                  <>
                    <span>{selectedFile}</span>
                    <span className="compare-view__diff-subtitle">
                      ({base} ... {head})
                    </span>
                  </>
                ) : (
                  <span>Select a file to view differences</span>
                )}
              </span>
              {selectedFile && (
                <IconButton
                  icon={ExternalLink}
                  label="Open diff tab"
                  size={14}
                  onClick={handleOpenInDiffView}
                />
              )}
            </div>

            <div className="compare-view__diff-content">
              {parsedLines.map((item, index) => (
                <div
                  key={index}
                  className={`compare-view__unified-line compare-view__unified-line--${item.kind}`}
                >
                  <span className="compare-view__gutter compare-view__gutter--old">
                    {item.oldLine ?? ""}
                  </span>
                  <span className="compare-view__gutter compare-view__gutter--new">
                    {item.newLine ?? ""}
                  </span>
                  <span className="compare-view__code">{item.text || " "}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="compare-view__loading">Loading comparison...</div>
      )}
    </div>
  );
}
