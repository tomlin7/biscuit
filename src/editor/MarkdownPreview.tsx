import { useMemo } from "react";
import { renderMarkdown } from "./markdown";
import { rewriteMarkdownImages } from "./markdownAssets";
import "./MarkdownPreview.css";

type Props = {
  source: string;
  filePath: string;
};

export function MarkdownPreview({ source, filePath }: Props) {
  const html = useMemo(
    () => rewriteMarkdownImages(renderMarkdown(source), filePath),
    [source, filePath],
  );
  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
