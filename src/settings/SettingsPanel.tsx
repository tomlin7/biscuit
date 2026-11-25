import { X } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { BUILTIN_THEMES } from "../editor/theme";
import { useAi } from "../ai/AiContext";
import { IconButton } from "../ui/IconButton";
import { useSettings } from "./SettingsContext";
import "./SettingsPanel.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsPanel({ open, onClose }: Props) {
  const { theme, extras, setTheme } = useTheme();
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
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                {BUILTIN_THEMES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
                {extras.map((extra) => (
                  <option key={extra.id} value={`ext:${extra.id}`}>
                    {extra.label}
                  </option>
                ))}
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
            <label className="settings-row">
              <span>Wrap column</span>
              <input
                type="number"
                min={40}
                max={200}
                value={settings.editor.wordWrapColumn}
                disabled={!settings.editor.wordWrap}
                onChange={(e) =>
                  updateEditor({
                    wordWrapColumn: Math.min(
                      200,
                      Math.max(40, Number(e.target.value) || 80),
                    ),
                  })
                }
              />
            </label>
            <label className="settings-row settings-row--stack">
              <span>Rulers</span>
              <input
                value={settings.editor.rulers}
                placeholder="80, 120"
                onChange={(e) => updateEditor({ rulers: e.target.value })}
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Trim trailing whitespace on save</span>
              <input
                type="checkbox"
                checked={settings.editor.trimTrailingWhitespace}
                onChange={(e) =>
                  updateEditor({ trimTrailingWhitespace: e.target.checked })
                }
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Insert final newline on save</span>
              <input
                type="checkbox"
                checked={settings.editor.insertFinalNewline}
                onChange={(e) =>
                  updateEditor({ insertFinalNewline: e.target.checked })
                }
              />
            </label>
            <label className="settings-row settings-row--check">
              <span>Render whitespace</span>
              <input
                type="checkbox"
                checked={settings.editor.renderWhitespace}
                onChange={(e) =>
                  updateEditor({ renderWhitespace: e.target.checked })
                }
              />
            </label>
            <label className="settings-row">
              <span>Cursor style</span>
              <select
                value={settings.editor.cursorStyle}
                onChange={(e) =>
                  updateEditor({
                    cursorStyle: e.target.value as "line" | "block" | "underline",
                  })
                }
              >
                <option value="line">Line</option>
                <option value="block">Block</option>
                <option value="underline">Underline</option>
              </select>
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
            <label className="settings-row settings-row--check">
              <span>Sticky scroll</span>
              <input
                type="checkbox"
                checked={settings.editor.stickyScroll}
                onChange={(e) => updateEditor({ stickyScroll: e.target.checked })}
              />
            </label>
            <label className="settings-row">
              <span>Auto save</span>
              <select
                value={String(settings.editor.autoSaveMs)}
                onChange={(e) =>
                  updateEditor({ autoSaveMs: Number(e.target.value) || 0 })
                }
              >
                <option value="0">Off</option>
                <option value="1000">After 1s</option>
                <option value="2000">After 2s</option>
                <option value="5000">After 5s</option>
              </select>
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
            <label className="settings-row settings-row--stack">
              <span>Temperature</span>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                placeholder="default"
                value={ai.temperature ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    setAi({ temperature: null });
                    return;
                  }
                  const next = Number(raw);
                  if (Number.isFinite(next)) {
                    setAi({ temperature: Math.min(2, Math.max(0, next)) });
                  }
                }}
              />
            </label>
            <div className="settings-presets" role="group" aria-label="Model presets">
              {[
                "gpt-4o-mini",
                "gpt-4o",
                "gpt-4.1-mini",
                "o4-mini",
                "claude-sonnet-4-20250514",
              ].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={
                    ai.model === id
                      ? "settings-preset settings-preset--active"
                      : "settings-preset"
                  }
                  onClick={() => setAi({ model: id })}
                >
                  {id}
                </button>
              ))}
            </div>
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
