import { useDiagnostics } from "../lsp/DiagnosticsContext";
import { useWorkspace } from "../workspace/WorkspaceContext";
import "./ProblemsPanel.css";

export function ProblemsPanel() {
  const { problems } = useDiagnostics();
  const { openFileAt } = useWorkspace();

  return (
    <div className="problems-panel">
      {problems.length === 0 ? (
        <p className="problems-panel__empty">No problems detected.</p>
      ) : (
        <ul className="problems-panel__list">
          {problems.map((problem) => (
            <li key={problem.id}>
              <button
                type="button"
                className={`problems-panel__row problems-panel__row--${problem.severity}`}
                onClick={() =>
                  void openFileAt(problem.path, problem.line, problem.column)
                }
              >
                <span className="problems-panel__sev">{problem.severity}</span>
                <span className="problems-panel__msg">{problem.message}</span>
                <span className="problems-panel__loc">
                  {problem.path}:{problem.line}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
