import { AppShell } from "./layout/AppShell";
import { ThemeProvider } from "./theme/ThemeContext";
import { SettingsWindowApp } from "./settings/SettingsWindow";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import "./styles/tokens.css";
import "./styles/global.css";

function isSettingsWindow() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("window") === "settings";
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        {isSettingsWindow() ? <SettingsWindowApp /> : <AppShell />}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
