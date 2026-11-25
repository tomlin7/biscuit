import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { closeDiffTab, subscribeDiff } from "./diffBus";
import { IconButton } from "../ui/IconButton";
import "./DiffView.css";

export function useDiffTab() {
  const [diff, setDiff] = useState<{ path: string; text: string } | null>(null);
  useEffect(() => subscribeDiff(setDiff), []);
  return diff;
}

export function DiffView({ path, text }: { path: string; text: string }) {
  const lines = (text || "(no changes)").split("\n");
  return (
    <div className="diff-view">
      <div className="diff-view__bar">
        <span>Diff — {path}</span>
        <IconButton icon={X} label="Close diff" size={14} onClick={closeDiffTab} />
      </div>
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
    </div>
  );
}
