import React from "react";
import ReactDOM from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import "@fontsource-variable/dm-sans";
import { setupMonacoEnvironment } from "./editor/monacoEnvironment";
import App from "./App";

import { ErrorBoundary } from "./ui/ErrorBoundary";

setupMonacoEnvironment();
loader.config({ monaco });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
