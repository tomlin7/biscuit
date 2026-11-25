type SeverityFilter = "all" | "error" | "warning";

type Listener = () => void;

let listener: Listener | null = null;

export function setCycleProblemsFilterListener(next: Listener | null) {
  listener = next;
}

export function requestCycleProblemsFilter() {
  listener?.();
}

export function nextProblemsFilter(current: SeverityFilter): SeverityFilter {
  if (current === "all") return "error";
  if (current === "error") return "warning";
  return "all";
}
