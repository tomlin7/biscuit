import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ErrorBoundary } from "./ErrorBoundary";
import { SettingsProvider, useSettings } from "../settings/SettingsContext";
import { ExtensionsProvider } from "../extensions/ExtensionsContext";

function SafeComponent() {
  return React.createElement("div", { id: "safe" }, "All is well");
}

function SettingsConsumer() {
  const { settings } = useSettings();
  return React.createElement("div", { id: "font-size" }, String(settings.editor.fontSize));
}

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

  it("updates state via getDerivedStateFromError", () => {
    const err = new Error("Test explosion");
    const nextState = ErrorBoundary.getDerivedStateFromError(err);
    expect(nextState.hasError).toBe(true);
    expect(nextState.error).toBe(err);
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

    const err = new Error("Catch test");
    const info = { componentStack: "\n    at SafeComponent\n    at ErrorBoundary" };
    boundary.componentDidCatch(err, info);

    expect(capturedError).toBe(err);
    expect(capturedInfo).toBe(info);
    expect(boundary.state.errorInfo).toBe(info);
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
