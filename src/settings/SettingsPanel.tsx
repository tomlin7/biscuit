import { X } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useAi } from "../ai/AiContext";
import { IconButton } from "../ui/IconButton";
import { useSettings } from "./SettingsContext";
import "./SettingsPanel.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsPanel({ open, onClose }: Props) {
  const { theme, setTheme } = useTheme();
  const { settings, updateEditor, reset } = useSettings();
  const { settings: ai, setSettings: setAi } = useAi();

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <button type="button" className="settings-overlay__backdrop" onClick={onClose} aria-label="Close" />
      <div className="settings-panel island">
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>

        <div className="settings-panel__body">
          <section>
            <h3>Appearance</h3>
            <label className="settings-row">
              <span>Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "dark" | "light")}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </section>

          <section>
            <h3>Editor</h3>
            <label className="settings-row">
              <span>Font size</span>
              <input
                type="number"
                min={10}
                max={24}
                value={settings.editor.fontSize}
                onChange={(e) => updateEditor({ fontSize: Number(e.target.value) || 13 })}
              />
            </label>
            <label className="settings-row">
              <span>Tab size</span>
              <input
                type="number"
                min={1}
                max={8}
                value={settings.editor.tabSize}
                onChange={(e) => updateEditor({ tabSize: Number(e.target.value) || 2 })}
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Word wrap</span>
              <input
                type="checkbox"
                checked={settings.editor.wordWrap}
                onChange={(e) => updateEditor({ wordWrap: e.target.checked })}
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Minimap</span>
              <input
                type="checkbox"
                checked={settings.editor.minimap}
                onChange={(e) => updateEditor({ minimap: e.target.checked })}
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Line numbers</span>
              <input
                type="checkbox"
                checked={settings.editor.lineNumbers}
                onChange={(e) => updateEditor({ lineNumbers: e.target.checked })}
              />
            </label>
          </section>

          <section>
            <h3>AI</h3>
            <label className="settings-row settings-row--stack">
              <span>Base URL</span>
              <input
                value={ai.baseUrl}
                onChange={(e) => setAi({ baseUrl: e.target.value })}
              />
            </label>
            <label className="settings-row settings-row--stack">
              <span>API key</span>
              <input
                type="password"
                value={ai.apiKey}
                onChange={(e) => setAi({ apiKey: e.target.value })}
                placeholder="sk-…"
              />
            </label>
            <label className="settings-row settings-row--stack">
              <span>Model</span>
              <input
                value={ai.model}
                onChange={(e) => setAi({ model: e.target.value })}
              />
            </label>
            <label className="settings-row">
              <span>Effort</span>
              <select
                value={ai.effort}
                onChange={(e) =>
                  setAi({
                    effort: e.target.value as "low" | "medium" | "high",
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </section>

          <button type="button" className="settings-reset" onClick={reset}>
            Reset editor defaults
          </button>
        </div>
      </div>
    </div>
  );
}
