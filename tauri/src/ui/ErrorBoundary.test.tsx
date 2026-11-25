import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ErrorBoundary, normalizeError } from "./ErrorBoundary";
import { SettingsProvider, useSettings } from "../settings/SettingsContext";
import { ExtensionsProvider } from "../extensions/ExtensionsContext";

function SafeComponent() {
  return React.createElement("div", { id: "safe" }, "All is well");
}

function SettingsConsumer() {
  const { settings } = useSettings();
  return React.createElement("div", { id: "font-size" }, String(settings.editor.fontSize));
}

describe("normalizeError helper", () => {
  it("preserves native Error instances", () => {
    const err = new Error("Native error");
    expect(normalizeError(err)).toBe(err);
  });

  it("converts raw string to Error with the string as message", () => {
    const err = normalizeError("Network timeout");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Network timeout");
  });

  it("extracts message from error-like objects", () => {
    const err = normalizeError({ message: "API failure", code: 500 });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("API failure");
  });

  it("serializes arbitrary objects without message", () => {
    const err = normalizeError({ status: "fatal" });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('{"status":"fatal"}');
  });

  it("handles null or undefined gracefully", () => {
    const err = normalizeError(null);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("An unexpected error occurred.");
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    const html = renderToString(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(SafeComponent),
      ),
    );
    expect(html).toContain("All is well");
    expect(html).toContain('id="safe"');
  });

  it("updates state via getDerivedStateFromError with Error instances", () => {
    const err = new Error("Test explosion");
    const nextState = ErrorBoundary.getDerivedStateFromError(err);
    expect(nextState.hasError).toBe(true);
    expect(nextState.error).toBe(err);
  });

  it("normalizes non-Error values in getDerivedStateFromError", () => {
    const nextState = ErrorBoundary.getDerivedStateFromError("Raw string error");
    expect(nextState.hasError).toBe(true);
    expect(nextState.error).toBeInstanceOf(Error);
    expect(nextState.error?.message).toBe("Raw string error");
  });

  it("renders custom fallback node when error is present", () => {
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      fallback: React.createElement("div", { id: "custom-fallback" }, "Recovered gracefully"),
    });

    boundary.state = {
      hasError: true,
      error: new Error("Simulated failure"),
      errorInfo: null,
      copied: false,
      showDetails: false,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);
    expect(html).toContain("Recovered gracefully");
    expect(html).toContain("custom-fallback");
  });

  it("renders custom fallback function with error and reset handler", () => {
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      fallback: (err) =>
        React.createElement(
          "button",
          null,
          `Failed: ${err.message}`,
        ),
    });

    boundary.state = {
      hasError: true,
      error: new Error("Custom error message"),
      errorInfo: null,
      copied: false,
      showDetails: false,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);
    expect(html).toContain("Failed: Custom error message");
  });

  it("renders default error boundary card with title and message", () => {
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      fallbackTitle: "Critical System Failure",
      variant: "fullscreen",
    });

    boundary.state = {
      hasError: true,
      error: new Error("Database disconnected"),
      errorInfo: null,
      copied: false,
      showDetails: false,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);
    expect(html).toContain("Critical System Failure");
    expect(html).toContain("Database disconnected");
    expect(html).toContain("error-boundary--fullscreen");
    expect(html).toContain("Try Again");
    expect(html).toContain("Reload Window");
    expect(html).toContain("Copy Diagnostics");
  });

  it("renders inline variant with appropriate class name", () => {
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      variant: "inline",
    });

    boundary.state = {
      hasError: true,
      error: new Error("Pane syntax parser failure"),
      errorInfo: null,
      copied: false,
      showDetails: false,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);
    expect(html).toContain("error-boundary--inline");
    expect(html).toContain("Component encountered an error");
    expect(html).toContain("Pane syntax parser failure");
  });

  it("renders stack-empty note when technical details are toggled with no stack", () => {
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
    });

    const errWithoutStack = new Error("Bare error");
    delete (errWithoutStack as any).stack;

    boundary.state = {
      hasError: true,
      error: errWithoutStack,
      errorInfo: null,
      copied: false,
      showDetails: true,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);
    expect(html).toContain("error-boundary__stack-empty");
    expect(html).toContain("No additional technical stack trace available");
  });

  it("resets state on handleReset and invokes onReset callback", () => {
    let onResetFired = false;
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      onReset: () => {
        onResetFired = true;
      },
    });

    boundary.setState = function (updater: any) {
      if (typeof updater === "function") {
        this.state = { ...this.state, ...updater(this.state) };
      } else {
        this.state = { ...this.state, ...updater };
      }
    };

    boundary.state = {
      hasError: true,
      error: new Error("Boom"),
      errorInfo: null,
      copied: true,
      showDetails: true,
    };

    boundary.handleReset();
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);
    expect(boundary.state.copied).toBe(false);
    expect(boundary.state.showDetails).toBe(false);
    expect(onResetFired).toBe(true);
  });

  it("automatically resets via componentDidUpdate when resetKeys change", () => {
    let resetCount = 0;
    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      resetKeys: ["/path/to/file-a.ts"],
      onReset: () => {
        resetCount++;
      },
    });

    boundary.setState = function (updater: any) {
      if (typeof updater === "function") {
        this.state = { ...this.state, ...updater(this.state) };
      } else {
        this.state = { ...this.state, ...updater };
      }
    };

    boundary.state = {
      hasError: true,
      error: new Error("File A broke"),
      errorInfo: null,
      copied: false,
      showDetails: false,
    };

    // When resetKeys do not change, do not reset
    boundary.componentDidUpdate({
      children: React.createElement(SafeComponent),
      resetKeys: ["/path/to/file-a.ts"],
    });
    expect(boundary.state.hasError).toBe(true);
    expect(resetCount).toBe(0);

    // When resetKeys change (user switches tab), reset error state!
    boundary.componentDidUpdate({
      children: React.createElement(SafeComponent),
      resetKeys: ["/path/to/file-b.ts"],
    });
    expect(boundary.state.hasError).toBe(false);
    expect(resetCount).toBe(1);
  });

  it("captures component stack and invokes onError callback in componentDidCatch", () => {
    let capturedError: Error | null = null;
    let capturedInfo: React.ErrorInfo | null = null;

    const boundary = new ErrorBoundary({
      children: React.createElement(SafeComponent),
      onError: (err, info) => {
        capturedError = err;
        capturedInfo = info;
      },
    });

    boundary.setState = function (updater: any) {
      if (typeof updater === "function") {
        this.state = { ...this.state, ...updater(this.state) };
      } else {
        this.state = { ...this.state, ...updater };
      }
    };

    const origConsoleError = console.error;
    console.error = () => {};
    try {
      const err = new Error("Catch test");
      const info = { componentStack: "\n    at SafeComponent\n    at ErrorBoundary" };
      boundary.componentDidCatch(err, info);

      expect(capturedError).toBe(err);
      expect(capturedInfo).toBe(info);
      expect(boundary.state.errorInfo).toBe(info);
    } finally {
      console.error = origConsoleError;
    }
  });

  it("falls back to document.execCommand when navigator.clipboard.writeText rejects", async () => {
    let execCommandCalled = false;
    let appendedTextarea: any = null;

    const origNavigator = globalThis.navigator;
    const origDocument = globalThis.document;

    (globalThis as any).navigator = {
      userAgent: "TestAgent",
      clipboard: {
        writeText: () => Promise.reject(new Error("Permission denied")),
      },
    };

    (globalThis as any).document = {
      createElement: (tag: string) => {
        const el = {
          tag,
          value: "",
          style: {},
          setAttribute: () => {},
          focus: () => {},
          select: () => {},
        };
        appendedTextarea = el;
        return el;
      },
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
      execCommand: (cmd: string) => {
        if (cmd === "copy") {
          execCommandCalled = true;
          return true;
        }
        return false;
      },
    };

    try {
      const boundary = new ErrorBoundary({
        children: React.createElement(SafeComponent),
      });
      boundary.setState = function (updater: any) {
        if (typeof updater === "function") {
          this.state = { ...this.state, ...updater(this.state) };
        } else {
          this.state = { ...this.state, ...updater };
        }
      };
      boundary.state = {
        hasError: true,
        error: new Error("Clipboard fallback test"),
        errorInfo: null,
        copied: false,
        showDetails: false,
      };

      await boundary.handleCopyDiagnostics();
      expect(execCommandCalled).toBe(true);
      expect(boundary.state.copied).toBe(true);
      expect(appendedTextarea?.value).toContain("Clipboard fallback test");
    } finally {
      (globalThis as any).navigator = origNavigator;
      (globalThis as any).document = origDocument;
    }
  });
});

describe("Provider Tree Hierarchy (SettingsProvider & ExtensionsProvider)", () => {
  it("throws useSettings error if ExtensionsProvider is mounted outside SettingsProvider", () => {
    expect(() => {
      renderToString(React.createElement(ExtensionsProvider, null, "Child"));
    }).toThrow("useSettings must be used within SettingsProvider");
  });

  it("mounts ExtensionsProvider cleanly when nested inside SettingsProvider", () => {
    const html = renderToString(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(
          ExtensionsProvider,
          null,
          React.createElement("div", { id: "ext-child" }, "Extensions Ready"),
        ),
      ),
    );
    expect(html).toContain("Extensions Ready");
    expect(html).toContain('id="ext-child"');
  });

  it("allows arbitrary consumers of useSettings to read default settings", () => {
    const html = renderToString(
      React.createElement(
        SettingsProvider,
        null,
        React.createElement(SettingsConsumer),
      ),
    );
    // default editor font size is 14
    expect(html).toContain("14");
  });
});
