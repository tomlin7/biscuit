import { useEffect, useMemo, useRef } from "react";
import { renderMarkdown } from "./markdown";
import { rewriteMarkdownImages } from "./markdownAssets";
import "./MarkdownPreview.css";

type Props = {
  source: string;
  filePath: string;
  scrollRatio?: number;
};

export function MarkdownPreview({ source, filePath, scrollRatio = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => rewriteMarkdownImages(renderMarkdown(source), filePath),
    [source, filePath],
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    el.scrollTop = max * scrollRatio;
  }, [scrollRatio, html]);

  return (
    <div
      ref={hostRef}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
