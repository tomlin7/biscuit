import { useEffect, useState } from "react";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { ProblemsPanel } from "../lsp/ProblemsPanel";
import { useDiagnostics } from "../lsp/DiagnosticsContext";
import "./BottomPanel.css";

export type BottomTab = "terminal" | "problems";

type Props = {
  open: boolean;
  tab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
};

export function BottomPanel({ open, tab, onTabChange }: Props) {
  const { problems } = useDiagnostics();
  const [mountedTerminal, setMountedTerminal] = useState(false);

  useEffect(() => {
    if (open) setMountedTerminal(true);
  }, [open]);

  if (!open) return null;

  return (
    <section className="bottom-panel island" aria-label="Panel">
      <div className="bottom-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "terminal"}
          className={
            tab === "terminal"
              ? "bottom-panel__tab bottom-panel__tab--active"
              : "bottom-panel__tab"
          }
          onClick={() => onTabChange("terminal")}
        >
          Terminal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "problems"}
          className={
            tab === "problems"
              ? "bottom-panel__tab bottom-panel__tab--active"
              : "bottom-panel__tab"
          }
          onClick={() => onTabChange("problems")}
        >
          Problems
          {problems.length > 0 ? (
            <span className="bottom-panel__badge">{problems.length}</span>
          ) : null}
        </button>
      </div>
      <div className="bottom-panel__body">
        {mountedTerminal ? (
          <div
            className="bottom-panel__pane"
            style={{ display: tab === "terminal" ? "flex" : "none" }}
          >
            <TerminalPanel open={open} embedded />
          </div>
        ) : null}
        {tab === "problems" ? (
          <div className="bottom-panel__pane">
            <ProblemsPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
