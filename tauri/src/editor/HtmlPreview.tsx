import { useEffect, useMemo, useRef } from "react";
import { rewriteHtmlAssets } from "./htmlAssets";
import "./HtmlPreview.css";

type Props = {
  source: string;
  filePath: string;
  scrollRatio?: number;
};

export function HtmlPreview({ source, filePath, scrollRatio = 0 }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(() => rewriteHtmlAssets(source, filePath), [source, filePath]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      try {
        const win = frame.contentWindow;
        const body = win?.document?.documentElement;
        if (!win || !body) return;
        const max = body.scrollHeight - win.innerHeight;
        if (max <= 0) return;
        win.scrollTo(0, max * scrollRatio);
      } catch {
        /* sandbox / cross-origin */
      }
    };
    apply();
    frame.addEventListener("load", apply);
    return () => frame.removeEventListener("load", apply);
  }, [scrollRatio, doc]);

  return (
    <iframe
      ref={frameRef}
      className="html-preview"
      title="HTML preview"
      sandbox="allow-same-origin"
      srcDoc={doc}
    />
  );
}
