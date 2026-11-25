import { useMemo } from "react";
import { rewriteHtmlAssets } from "./htmlAssets";
import "./HtmlPreview.css";

type Props = {
  source: string;
  filePath: string;
};

export function HtmlPreview({ source, filePath }: Props) {
  const doc = useMemo(() => rewriteHtmlAssets(source, filePath), [source, filePath]);
  return (
    <iframe
      className="html-preview"
      title="HTML preview"
      sandbox=""
      srcDoc={doc}
    />
  );
}
