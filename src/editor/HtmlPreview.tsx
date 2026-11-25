import "./HtmlPreview.css";

type Props = {
  source: string;
};

export function HtmlPreview({ source }: Props) {
  return (
    <iframe
      className="html-preview"
      title="HTML preview"
      sandbox=""
      srcDoc={source}
    />
  );
}
