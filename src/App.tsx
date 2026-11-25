import { AppShell } from "./layout/AppShell";
import { ThemeProvider } from "./theme/ThemeContext";
import "./styles/tokens.css";
import "./styles/global.css";

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
