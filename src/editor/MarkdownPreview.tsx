import { renderMarkdown } from "./markdown";
import "./MarkdownPreview.css";

type Props = {
  source: string;
};

export function MarkdownPreview({ source }: Props) {
  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
