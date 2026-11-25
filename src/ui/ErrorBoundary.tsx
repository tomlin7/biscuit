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
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
};

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

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
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

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(diagnostics);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = diagnostics;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    } catch {
      /* clipboard write failed */
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
                {error?.stack && (
                  <div className="error-boundary__stack-section">
                    <div className="error-boundary__stack-label">Stack Trace</div>
                    <pre className="error-boundary__stack-trace">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div className="error-boundary__stack-section">
                    <div className="error-boundary__stack-label">Component Stack</div>
                    <pre className="error-boundary__stack-trace">{errorInfo.componentStack}</pre>
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
