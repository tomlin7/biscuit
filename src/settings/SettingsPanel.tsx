import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Palette, RotateCcw, Search, Sliders, Sparkles, X } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { BUILTIN_THEMES } from "../editor/theme";
import { useAi } from "../ai/AiContext";
import { IconButton } from "../ui/IconButton";
import { useSettings } from "./SettingsContext";
import "./SettingsPanel.css";

export type SettingsCategory = "appearance" | "editor" | "ai";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsCategory;
};

export function SettingsPanel({ open, onClose, initialTab = "editor" }: Props) {
  const { theme, extras, setTheme } = useTheme();
  const { settings, updateEditor, reset } = useSettings();
  const { settings: ai, setSettings: setAi } = useAi();
  const [activeTab, setActiveTab] = useState<SettingsCategory>(initialTab);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setSearchQuery("");
    }
  }, [open, initialTab]);

  if (!open) return null;

  const q = searchQuery.trim().toLowerCase();

  const matchesAppearance = !q || "theme color dark light appearance".includes(q);
  const matchesEditorTypography = !q || "font size font family terminal font typography cascadia monospace".includes(q);
  const matchesEditorDisplay = !q || "word wrap column rulers cursor minimap line numbers sticky scroll display layout".includes(q);
  const matchesEditorFormatting = !q || "tab size whitespace trim trailing newline insert auto save formatting".includes(q);
  const matchesAiConnection = !q || "ai model base url api key gpt claude effort presets connection".includes(q);
  const matchesAiPrompt = !q || "system prompt instructions ai".includes(q);
  const matchesAiAdvanced = !q || "temperature max tokens top p presence frequency penalty seed error timeout tool rounds hyperparameters".includes(q);

  const showAppearance = q ? matchesAppearance : activeTab === "appearance";
  const showEditor = q ? (matchesEditorTypography || matchesEditorDisplay || matchesEditorFormatting) : activeTab === "editor";
  const showAi = q ? (matchesAiConnection || matchesAiPrompt || matchesAiAdvanced) : activeTab === "ai";

  const totalMatches = (matchesAppearance ? 1 : 0) + (matchesEditorTypography || matchesEditorDisplay || matchesEditorFormatting ? 1 : 0) + (matchesAiConnection || matchesAiPrompt || matchesAiAdvanced ? 1 : 0);

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <button type="button" className="settings-overlay__backdrop" onClick={onClose} aria-label="Close" />
      <div className="settings-panel island">
        <div className="settings-panel__header">
          <div className="settings-panel__tabs" role="tablist" aria-label="Settings categories">
            <button
              type="button"
              role="tab"
              aria-selected={!q && activeTab === "appearance"}
              className={`settings-panel__tab ${!q && activeTab === "appearance" ? "settings-panel__tab--active" : ""}`}
              onClick={() => {
                setSearchQuery("");
                setActiveTab("appearance");
              }}
            >
              <Palette size={14} />
              <span>Appearance</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!q && activeTab === "editor"}
              className={`settings-panel__tab ${!q && activeTab === "editor" ? "settings-panel__tab--active" : ""}`}
              onClick={() => {
                setSearchQuery("");
                setActiveTab("editor");
              }}
            >
              <Sliders size={14} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!q && activeTab === "ai"}
              className={`settings-panel__tab ${!q && activeTab === "ai" ? "settings-panel__tab--active" : ""}`}
              onClick={() => {
                setSearchQuery("");
                setActiveTab("ai");
              }}
            >
              <Sparkles size={14} />
              <span>AI</span>
            </button>
          </div>

          <div className="settings-panel__search-wrap">
            <Search size={13} className="settings-panel__search-icon" aria-hidden />
            <input
              type="search"
              className="settings-panel__search-input"
              placeholder="Search all settings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search all settings"
            />
            {searchQuery && (
              <button
                type="button"
                className="settings-panel__search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>

        <div className="settings-panel__body">
          {q && totalMatches === 0 && (
            <div className="settings-empty">
              <p>No settings matching &ldquo;{searchQuery}&rdquo;</p>
              <button type="button" className="settings-reset" onClick={() => setSearchQuery("")}>
                Clear search
              </button>
            </div>
          )}

          {showAppearance && (
            <section className="settings-section">
              <div className="settings-section__header-row">
                <h3 className="settings-section__title">Theme</h3>
                {q && <span className="settings-category-tag">Appearance</span>}
              </div>
              <label className="settings-row">
                <span>Color Theme</span>
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
          )}

          {showEditor && (
            <div className="settings-group">
              {matchesEditorTypography && (
                <section className="settings-section">
                  <div className="settings-section__header-row">
                    <h3 className="settings-section__title">Typography</h3>
                    {q && <span className="settings-category-tag">Editor</span>}
                  </div>
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
                  <label className="settings-row settings-row--stack">
                    <span>Font family</span>
                    <input
                      value={settings.editor.fontFamily}
                      onChange={(e) =>
                        updateEditor({
                          fontFamily:
                            e.target.value.trim() ||
                            "Cascadia Code, Consolas, Courier New, monospace",
                        })
                      }
                    />
                  </label>
                  <label className="settings-row">
                    <span>Terminal font size</span>
                    <input
                      type="number"
                      min={8}
                      max={32}
                      step={1}
                      value={settings.editor.terminalFontSize}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next)) {
                          updateEditor({
                            terminalFontSize: Math.min(32, Math.max(8, Math.floor(next))),
                          });
                        }
                      }}
                    />
                  </label>
                </section>
              )}

              {matchesEditorDisplay && (
                <section className="settings-section">
                  <div className="settings-section__header-row">
                    <h3 className="settings-section__title">Display & Layout</h3>
                    {q && <span className="settings-category-tag">Editor</span>}
                  </div>
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
                    <span>Rulers (comma separated columns)</span>
                    <input
                      value={settings.editor.rulers}
                      placeholder="80, 120"
                      onChange={(e) => updateEditor({ rulers: e.target.value })}
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
                </section>
              )}

              {matchesEditorFormatting && (
                <section className="settings-section">
                  <div className="settings-section__header-row">
                    <h3 className="settings-section__title">Formatting & Saving</h3>
                    {q && <span className="settings-category-tag">Editor</span>}
                  </div>
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
                    <span>Render whitespace</span>
                    <input
                      type="checkbox"
                      checked={settings.editor.renderWhitespace}
                      onChange={(e) =>
                        updateEditor({ renderWhitespace: e.target.checked })
                      }
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
              )}

              {!q && (
                <div className="settings-section__footer">
                  <button type="button" className="settings-reset" onClick={reset}>
                    <RotateCcw size={13} />
                    <span>Reset editor defaults</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {showAi && (
            <div id="settings-ai-section" className="settings-group">
              {matchesAiConnection && (
                <section className="settings-section">
                  <div className="settings-section__header-row">
                    <h3 className="settings-section__title">Model & Connection</h3>
                    {q && <span className="settings-category-tag">AI</span>}
                  </div>
                  <label className="settings-row settings-row--stack">
                    <span>Base URL</span>
                    <input
                      value={ai.baseUrl}
                      onChange={(e) => setAi({ baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>
                  <label className="settings-row settings-row--stack">
                    <span>API Key</span>
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
              )}

              {matchesAiPrompt && (
                <section className="settings-section">
                  <div className="settings-section__header-row">
                    <h3 className="settings-section__title">Instructions</h3>
                    {q && <span className="settings-category-tag">AI</span>}
                  </div>
                  <label className="settings-row settings-row--stack">
                    <span>System prompt</span>
                    <textarea
                      id="settings-ai-system-prompt"
                      rows={4}
                      value={ai.systemPrompt}
                      onChange={(e) => setAi({ systemPrompt: e.target.value })}
                      placeholder="Optional instructions applied to every chat session…"
                    />
                  </label>
                </section>
              )}

              {matchesAiAdvanced && (
                <section className="settings-section">
                  <button
                    type="button"
                    className="settings-section__toggle"
                    onClick={() => setShowAdvancedAi((v) => !v)}
                  >
                    {showAdvancedAi || q ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Advanced Hyperparameters</span>
                    {q && <span className="settings-category-tag">AI</span>}
                  </button>

                  {(showAdvancedAi || q) && (
                    <div className="settings-section__advanced">
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
                      <label className="settings-row settings-row--stack">
                        <span>Max tokens</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="default"
                          value={ai.maxTokens ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              setAi({ maxTokens: null });
                              return;
                            }
                            const next = Number(raw);
                            if (Number.isFinite(next) && next > 0) {
                              setAi({ maxTokens: Math.floor(next) });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Top P</span>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          placeholder="default"
                          value={ai.topP ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              setAi({ topP: null });
                              return;
                            }
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setAi({ topP: Math.min(1, Math.max(0, next)) });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Presence penalty</span>
                        <input
                          type="number"
                          min={-2}
                          max={2}
                          step={0.1}
                          placeholder="default"
                          value={ai.presencePenalty ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              setAi({ presencePenalty: null });
                              return;
                            }
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setAi({
                                presencePenalty: Math.min(2, Math.max(-2, next)),
                              });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Frequency penalty</span>
                        <input
                          type="number"
                          min={-2}
                          max={2}
                          step={0.1}
                          placeholder="default"
                          value={ai.frequencyPenalty ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              setAi({ frequencyPenalty: null });
                              return;
                            }
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setAi({
                                frequencyPenalty: Math.min(2, Math.max(-2, next)),
                              });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Seed</span>
                        <input
                          type="number"
                          step={1}
                          placeholder="default"
                          value={ai.seed ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) {
                              setAi({ seed: null });
                              return;
                            }
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setAi({ seed: Math.floor(next) });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--check">
                        <span>Stop on tool error</span>
                        <input
                          type="checkbox"
                          checked={ai.stopOnToolError}
                          onChange={(e) => setAi({ stopOnToolError: e.target.checked })}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Max tool rounds</span>
                        <input
                          type="number"
                          min={1}
                          max={32}
                          step={1}
                          value={ai.maxToolRounds}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (Number.isFinite(next)) {
                              setAi({
                                maxToolRounds: Math.min(32, Math.max(1, Math.floor(next))),
                              });
                            }
                          }}
                        />
                      </label>
                      <label className="settings-row settings-row--stack">
                        <span>Request timeout (seconds)</span>
                        <input
                          type="number"
                          min={0}
                          max={600}
                          step={1}
                          value={ai.requestTimeoutSec}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (Number.isFinite(next)) {
                              setAi({
                                requestTimeoutSec: Math.min(
                                  600,
                                  Math.max(0, Math.floor(next)),
                                ),
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
