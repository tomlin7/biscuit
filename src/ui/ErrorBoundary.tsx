import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import "./ErrorBoundary.css";

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallbackTitle?: string;
  variant?: "fullscreen" | "inline";
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
};

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (typeof error === "object" && error !== null) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return new Error(msg);
    try {
      return new Error(JSON.stringify(error));
    } catch {
      /* ignore */
    }
  }
  return new Error("An unexpected error occurred.");
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { hasError: true, error: normalizeError(error) };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    const err = normalizeError(error);
    this.setState({ errorInfo });
    this.props.onError?.(err, errorInfo);
    console.error("[ErrorBoundary caught an unhandled error]:", err, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return;
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged =
        this.props.resetKeys.length !== prevProps.resetKeys.length ||
        this.props.resetKeys.some((val, idx) => !Object.is(val, prevProps.resetKeys![idx]));
      if (hasChanged) {
        this.handleReset();
      }
    }
  }

  componentWillUnmount(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleCopyDiagnostics = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const diagnostics = [
      "=== Morsel / T3D Crash Diagnostic Report ===",
      `Time: ${new Date().toISOString()}`,
      `Error: ${error?.name ?? "Error"}: ${error?.message ?? "Unknown error"}`,
      "",
      "--- Stack Trace ---",
      error?.stack ?? "No stack trace available",
      "",
      "--- Component Stack ---",
      errorInfo?.componentStack ?? "No component stack available",
      "",
      "--- Environment ---",
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "N/A"}`,
    ].join("\n");

    let copiedSuccess = false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(diagnostics);
        copiedSuccess = true;
      } catch {
        /* Fall back to document.execCommand below */
      }
    }

    if (!copiedSuccess && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = diagnostics;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copiedSuccess = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        /* copy failed */
      }
    }

    if (copiedSuccess) {
      this.setState({ copied: true });
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, copied, showDetails } = this.state;
    const { children, fallback, fallbackTitle, variant = "fullscreen" } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === "function") {
        return fallback(error ?? new Error("Unknown error"), this.handleReset);
      }
      return fallback;
    }

    const title =
      fallbackTitle ??
      (variant === "inline" ? "Component encountered an error" : "Something went wrong");
    const isInline = variant === "inline";
    const hasStack = Boolean(error?.stack);
    const hasComponentStack = Boolean(errorInfo?.componentStack);

    return (
      <div
        className={`error-boundary ${isInline ? "error-boundary--inline" : "error-boundary--fullscreen"}`}
        role="alert"
      >
        <div className="error-boundary__card">
          <div className="error-boundary__header">
            <div className="error-boundary__icon" aria-hidden="true">
              <AlertTriangle size={isInline ? 20 : 28} strokeWidth={1.75} />
            </div>
            <div className="error-boundary__title-group">
              <h2 className="error-boundary__title">{title}</h2>
              <p className="error-boundary__subtitle">
                {error?.message || "An unexpected error occurred."}
              </p>
            </div>
          </div>

          <div className="error-boundary__actions">
            <button
              type="button"
              className="error-boundary__btn error-boundary__btn--primary"
              onClick={this.handleReset}
            >
              <RotateCcw size={14} />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              className="error-boundary__btn error-boundary__btn--secondary"
              onClick={this.handleReload}
            >
              <RefreshCw size={14} />
              <span>Reload Window</span>
            </button>
            <button
              type="button"
              className="error-boundary__btn error-boundary__btn--secondary"
              onClick={this.handleCopyDiagnostics}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied Report" : "Copy Diagnostics"}</span>
            </button>
          </div>

          <div className="error-boundary__details-container">
            <button
              type="button"
              className="error-boundary__details-toggle"
              onClick={this.toggleDetails}
              aria-expanded={showDetails}
            >
              {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
            </button>

            {showDetails && (
              <div className="error-boundary__details-content">
                {hasStack && (
                  <div className="error-boundary__stack-section">
                    <div className="error-boundary__stack-label">Stack Trace</div>
                    <pre className="error-boundary__stack-trace">{error!.stack}</pre>
                  </div>
                )}
                {hasComponentStack && (
                  <div className="error-boundary__stack-section">
                    <div className="error-boundary__stack-label">Component Stack</div>
                    <pre className="error-boundary__stack-trace">{errorInfo!.componentStack}</pre>
                  </div>
                )}
                {!hasStack && !hasComponentStack && (
                  <div className="error-boundary__stack-empty">
                    No additional technical stack trace available.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
