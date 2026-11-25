import { AppShell } from "./layout/AppShell";
import { ThemeProvider } from "./theme/ThemeContext";
import { SettingsWindowApp } from "./settings/SettingsWindow";
import "./styles/tokens.css";
import "./styles/global.css";

function isSettingsWindow() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("window") === "settings";
}

function App() {
  if (isSettingsWindow()) {
    return (
      <ThemeProvider>
        <SettingsWindowApp />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
