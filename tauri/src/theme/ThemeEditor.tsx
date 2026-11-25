import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode,
  FolderTree,
  Paintbrush,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
  Eye,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import {
  type CustomThemeDefinition,
  type UiTheme,
  THEME_COLOR_SLOTS,
  THEME_PRESETS,
  exportCustomThemeJson,
  importCustomThemeFromJson,
  normalizeHex,
  slugifyThemeId,
  applyCustomThemeCss,
} from "./customTheme";
import "./ThemeEditor.css";

type PresetKey = keyof typeof THEME_PRESETS;

interface ThemeEditorProps {
  onClose?: () => void;
}

export function ThemeEditor({ onClose }: ThemeEditorProps) {
  const {
    theme: activeTheme,
    customThemes,
    saveCustomTheme,
    deleteCustomTheme,
  } = useTheme();

  // Active theme selection ("new" or custom id)
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    if (activeTheme.startsWith("custom:")) {
      return activeTheme.slice(7);
    }
    return customThemes.length > 0 ? customThemes[0].id : "new";
  });

  // Current editing state
  const [label, setLabel] = useState<string>("My Custom Theme");
  const [id, setId] = useState<string>("my-custom-theme");
  const [uiTheme, setUiTheme] = useState<UiTheme>("vs-dark");
  const [colors, setColors] = useState<CustomThemeDefinition["colors"]>(() => ({
    ...THEME_PRESETS.dark.colors,
  }));

  const [livePreview, setLivePreview] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Dialog states
  const [exportOpen, setExportOpen] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // Load selected theme data into editing form
  const loadThemeIntoEditor = useCallback(
    (targetId: string) => {
      if (targetId === "new") {
        const base = THEME_PRESETS.dark;
        setLabel("New Custom Theme");
        setId(`custom-${Date.now().toString(36).slice(-4)}`);
        setUiTheme("vs-dark");
        setColors({ ...base.colors });
        return;
      }

      const found = customThemes.find((t) => t.id === targetId);
      if (found) {
        setLabel(found.label);
        setId(found.id);
        setUiTheme(found.uiTheme);
        setColors({ ...found.colors });
      } else {
        setSelectedThemeId("new");
        const base = THEME_PRESETS.dark;
        setLabel("New Custom Theme");
        setId(`custom-${Date.now().toString(36).slice(-4)}`);
        setUiTheme("vs-dark");
        setColors({ ...base.colors });
      }
    },
    [customThemes]
  );

  useEffect(() => {
    loadThemeIntoEditor(selectedThemeId);
  }, [selectedThemeId, loadThemeIntoEditor]);

  // Handle color change for a slot
  const handleColorChange = useCallback((key: string, val: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: val,
    }));
  }, []);

  // Update live preview in real app when enabled with unified unmount cleanup
  useEffect(() => {
    if (livePreview) {
      applyCustomThemeCss({
        id,
        label,
        uiTheme,
        colors,
      });
    } else {
      if (activeTheme.startsWith("custom:")) {
        const activeCustom = customThemes.find((t) => t.id === activeTheme.slice(7));
        applyCustomThemeCss(activeCustom || null);
      } else {
        applyCustomThemeCss(null);
      }
    }

    return () => {
      if (activeTheme.startsWith("custom:")) {
        const activeCustom = customThemes.find((t) => t.id === activeTheme.slice(7));
        applyCustomThemeCss(activeCustom || null);
      } else {
        applyCustomThemeCss(null);
      }
    };
  }, [livePreview, id, label, uiTheme, colors, activeTheme, customThemes]);

  // Modal keyboard accessibility
  useEffect(() => {
    if (!exportOpen && !importOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportOpen(false);
        setImportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exportOpen, importOpen]);

  // Clone from preset
  const handleClonePreset = (presetKey: PresetKey) => {
    const preset = THEME_PRESETS[presetKey];
    setUiTheme(preset.uiTheme);
    setColors({ ...preset.colors });
    if (selectedThemeId === "new" && (label === "New Custom Theme" || label.startsWith("New Custom"))) {
      setLabel(`${preset.label} Custom`);
      setId(`${presetKey}-custom`);
    }
    setSaveStatus(`Applied preset '${preset.label}'. Save to persist.`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Save handler
  const handleSave = () => {
    const cleanId = slugifyThemeId(id || label);
    const newTheme: CustomThemeDefinition = {
      id: cleanId,
      label: label.trim() || "Custom Theme",
      uiTheme,
      colors,
    };
    if (selectedThemeId !== "new" && selectedThemeId !== cleanId) {
      deleteCustomTheme(selectedThemeId);
    }
    saveCustomTheme(newTheme);
    setSelectedThemeId(cleanId);
    setId(cleanId);
    setSaveStatus("Theme saved successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Reset handler
  const handleReset = () => {
    loadThemeIntoEditor(selectedThemeId);
    setSaveStatus("Edits reset to original.");
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Delete handler
  const handleDelete = () => {
    if (selectedThemeId === "new") return;
    deleteCustomTheme(selectedThemeId);
    setSelectedThemeId("new");
    setSaveStatus("Theme deleted.");
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Export JSON string
  const currentExportJson = useMemo(() => {
    const themeDef: CustomThemeDefinition = {
      id: slugifyThemeId(id || label),
      label: label.trim() || "Custom Theme",
      uiTheme,
      colors,
    };
    return exportCustomThemeJson(themeDef);
  }, [id, label, uiTheme, colors]);

  const handleCopyExport = async () => {
    let copiedSuccess = false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(currentExportJson);
        copiedSuccess = true;
      } catch {
        /* Fallback below */
      }
    }

    if (!copiedSuccess && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = currentExportJson;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.select();
        copiedSuccess = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        /* copy failed */
      }
    }

    if (copiedSuccess) {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    }
  };

  const handleDownloadExport = () => {
    const blob = new Blob([currentExportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyThemeId(id || label)}.json`;
    if (typeof document !== "undefined") {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // Import handler
  const handleImportSubmit = () => {
    try {
      setImportError(null);
      const imported = importCustomThemeFromJson(importText);
      saveCustomTheme(imported);
      setSelectedThemeId(imported.id);
      setLabel(imported.label);
      setId(imported.id);
      setUiTheme(imported.uiTheme);
      setColors({ ...imported.colors });
      setImportOpen(false);
      setImportText("");
      setSaveStatus(`Imported theme '${imported.label}' successfully!`);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      setImportError(err?.message || "Failed to parse theme JSON.");
    }
  };

  const editorSlots = THEME_COLOR_SLOTS.filter((s) => s.category === "editor");
  const chromeSlots = THEME_COLOR_SLOTS.filter((s) => s.category === "chrome");

  return (
    <div className="theme-editor" data-testid="theme-editor">
      {/* Editor Header */}
      <div className="theme-editor__header">
        <div className="theme-editor__header-title">
          <Paintbrush size={18} className="theme-editor__header-icon" />
          <div>
            <h3>Visual Theme Editor</h3>
            <p className="theme-editor__subtitle">
              Design custom colors, preview in real time, and export extension-ready JSON.
            </p>
          </div>
        </div>

        <div className="theme-editor__header-actions">
          {saveStatus && (
            <span className="theme-editor__status-toast" role="status">
              {saveStatus}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              className="theme-editor__btn theme-editor__btn--ghost"
              onClick={onClose}
              title="Close"
              aria-label="Close theme editor"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar / Presets Bar */}
      <div className="theme-editor__toolbar">
        <div className="theme-editor__toolbar-group">
          <label className="theme-editor__field-inline">
            <span className="theme-editor__field-label">Target Theme:</span>
            <select
              value={selectedThemeId}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              aria-label="Select target theme"
              className="theme-editor__select"
            >
              <option value="new">+ Create New Theme</option>
              {customThemes.length > 0 && (
                <optgroup label="Custom Themes">
                  {customThemes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.label} ({ct.id})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className="theme-editor__field-inline">
            <span className="theme-editor__field-label">Clone Preset:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleClonePreset(e.target.value as PresetKey);
                  e.target.value = "";
                }
              }}
              aria-label="Clone from preset"
              className="theme-editor__select"
            >
              <option value="" disabled>
                Select preset to clone...
              </option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="gruvbox">Gruvbox</option>
              <option value="catppuccin">Catppuccin</option>
            </select>
          </label>
        </div>

        <div className="theme-editor__toolbar-actions">
          <label className="theme-editor__toggle-label" title="Apply theme live to application chrome">
            <input
              type="checkbox"
              checked={livePreview}
              onChange={(e) => setLivePreview(e.target.checked)}
            />
            <Eye size={13} />
            <span>Live in App</span>
          </label>

          <button
            type="button"
            className="theme-editor__btn theme-editor__btn--primary"
            onClick={handleSave}
            title="Save theme"
            aria-label="Save theme"
          >
            <Save size={13} />
            <span>Save Theme</span>
          </button>

          <button
            type="button"
            className="theme-editor__btn"
            onClick={handleReset}
            title="Reset changes"
            aria-label="Reset theme"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="theme-editor__btn"
            onClick={() => setExportOpen(true)}
            title="Export Theme JSON"
            aria-label="Export JSON"
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            className="theme-editor__btn"
            onClick={() => {
              setImportText("");
              setImportError(null);
              setImportOpen(true);
            }}
            title="Import Theme JSON"
            aria-label="Import JSON"
          >
            <Upload size={13} />
            <span>Import JSON</span>
          </button>

          {selectedThemeId !== "new" && (
            <button
              type="button"
              className="theme-editor__btn theme-editor__btn--danger"
              onClick={handleDelete}
              title="Delete custom theme"
              aria-label="Delete custom theme"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Controls (Left) & Miniature Live Preview (Right) */}
      <div className="theme-editor__body">
        {/* Left Column: Metadata & Color Inputs */}
        <div className="theme-editor__form-pane">
          {/* Metadata Section */}
          <section className="theme-editor__section">
            <h4 className="theme-editor__section-heading">Theme Metadata</h4>
            <div className="theme-editor__meta-grid">
              <label className="theme-editor__meta-field">
                <span>Theme Label</span>
                <input
                  type="text"
                  value={label}
                  placeholder="e.g. Cobalt Sunset"
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (selectedThemeId === "new") {
                      setId(slugifyThemeId(e.target.value));
                    }
                  }}
                  className="theme-editor__input"
                />
              </label>

              <label className="theme-editor__meta-field">
                <span>Theme ID</span>
                <input
                  type="text"
                  value={id}
                  placeholder="e.g. cobalt-sunset"
                  onChange={(e) => setId(slugifyThemeId(e.target.value))}
                  className="theme-editor__input"
                />
              </label>

              <label className="theme-editor__meta-field">
                <span>Base UI Mode</span>
                <select
                  value={uiTheme}
                  onChange={(e) => setUiTheme(e.target.value as UiTheme)}
                  className="theme-editor__select"
                >
                  <option value="vs-dark">Dark (vs-dark)</option>
                  <option value="vs">Light (vs)</option>
                </select>
              </label>
            </div>
          </section>

          {/* Editor Color Slots */}
          <section className="theme-editor__section">
            <h4 className="theme-editor__section-heading">Code Editor Colors</h4>
            <div className="theme-editor__slots-list">
              {editorSlots.map((slot) => {
                const rawVal = colors[slot.key] || slot.fallback;
                const pickerVal = normalizeHex(rawVal, slot.fallback);
                return (
                  <div key={slot.key} className="theme-editor__slot-row">
                    <div className="theme-editor__slot-info">
                      <span className="theme-editor__slot-label">{slot.label}</span>
                      <span className="theme-editor__slot-key">{slot.key}</span>
                    </div>

                    <div className="theme-editor__color-control">
                      <label
                        className="theme-editor__swatch-wrapper"
                        style={{ backgroundColor: pickerVal }}
                        title="Pick color"
                      >
                        <input
                          type="color"
                          value={pickerVal}
                          onChange={(e) => handleColorChange(slot.key, e.target.value)}
                          className="theme-editor__color-input"
                          aria-label={`${slot.label} color picker`}
                        />
                      </label>
                      <input
                        type="text"
                        value={rawVal}
                        onChange={(e) => handleColorChange(slot.key, e.target.value)}
                        placeholder={slot.fallback}
                        className="theme-editor__hex-input"
                        aria-label={`${slot.label} hex code`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Window Chrome Color Slots */}
          <section className="theme-editor__section">
            <h4 className="theme-editor__section-heading">Window & Chrome Colors</h4>
            <div className="theme-editor__slots-list">
              {chromeSlots.map((slot) => {
                const rawVal = colors[slot.key] || slot.fallback;
                const pickerVal = normalizeHex(rawVal, slot.fallback);
                return (
                  <div key={slot.key} className="theme-editor__slot-row">
                    <div className="theme-editor__slot-info">
                      <span className="theme-editor__slot-label">{slot.label}</span>
                      <span className="theme-editor__slot-key">{slot.key}</span>
                    </div>

                    <div className="theme-editor__color-control">
                      <label
                        className="theme-editor__swatch-wrapper"
                        style={{ backgroundColor: pickerVal }}
                        title="Pick color"
                      >
                        <input
                          type="color"
                          value={pickerVal}
                          onChange={(e) => handleColorChange(slot.key, e.target.value)}
                          className="theme-editor__color-input"
                          aria-label={`${slot.label} color picker`}
                        />
                      </label>
                      <input
                        type="text"
                        value={rawVal}
                        onChange={(e) => handleColorChange(slot.key, e.target.value)}
                        placeholder={slot.fallback}
                        className="theme-editor__hex-input"
                        aria-label={`${slot.label} hex code`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Miniature Live Preview */}
        <div className="theme-editor__preview-pane">
          <div className="theme-editor__preview-header">
            <span className="theme-editor__preview-title">Interactive Live Preview</span>
            <span className="theme-editor__preview-tag">Real-time Miniature</span>
          </div>

          <div
            className="theme-preview-frame"
            data-testid="theme-live-preview"
            style={{
              borderColor: colors.border,
            }}
          >
            {/* Top Mock Titlebar */}
            <div
              className="theme-preview-titlebar"
              style={{
                backgroundColor: colors["activityBar.background"],
                color: colors["activityBar.foreground"],
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div className="theme-preview-dots">
                <span className="theme-preview-dot theme-preview-dot--red" />
                <span className="theme-preview-dot theme-preview-dot--yellow" />
                <span className="theme-preview-dot theme-preview-dot--green" />
              </div>
              <span className="theme-preview-titlebar-title">{label || "Morsel Editor"}</span>
              <div className="theme-preview-titlebar-accent" style={{ backgroundColor: colors.accent }} />
            </div>

            {/* Middle Main Mock Area */}
            <div className="theme-preview-main">
              {/* Activity Bar Strip */}
              <div
                className="theme-preview-activitybar"
                style={{
                  backgroundColor: colors["activityBar.background"],
                  color: colors["activityBar.foreground"],
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                <div
                  className="theme-preview-activitybar-item theme-preview-activitybar-item--active"
                  style={{
                    borderLeft: `2px solid ${colors.accent}`,
                    color: colors.accent,
                  }}
                >
                  <FolderTree size={12} />
                </div>
                <div className="theme-preview-activitybar-item">
                  <FileCode size={12} />
                </div>
                <div className="theme-preview-activitybar-item">
                  <Paintbrush size={12} />
                </div>
              </div>

              {/* Sidebar Mock Area */}
              <div
                className="theme-preview-sidebar"
                style={{
                  backgroundColor: colors["sideBar.background"],
                  color: colors["sideBar.foreground"],
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                <div className="theme-preview-sidebar-header">
                  <span>EXPLORER</span>
                </div>
                <div className="theme-preview-sidebar-tree">
                  <div className="theme-preview-tree-item theme-preview-tree-item--dir">
                    📁 <span>src</span>
                  </div>
                  <div
                    className="theme-preview-tree-item theme-preview-tree-item--active"
                    style={{
                      backgroundColor: normalizeHex(colors["sideBar.foreground"], "#e8e8e8") + "18",
                    }}
                  >
                    📄 <span>App.tsx</span>
                  </div>
                  <div className="theme-preview-tree-item">
                    📄 <span>main.rs</span>
                  </div>
                  <div className="theme-preview-tree-item">
                    📄 <span>theme.json</span>
                  </div>
                </div>
              </div>

              {/* Code Editor Mock Area */}
              <div
                className="theme-preview-editor"
                style={{
                  backgroundColor: colors["editor.background"],
                  color: colors["editor.foreground"],
                }}
              >
                {/* Mini Tabs */}
                <div
                  className="theme-preview-tabs"
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: colors["sideBar.background"],
                  }}
                >
                  <div
                    className="theme-preview-tab theme-preview-tab--active"
                    style={{
                      backgroundColor: colors["editor.background"],
                      color: colors["editor.foreground"],
                      borderTop: `2px solid ${colors.accent}`,
                    }}
                  >
                    App.tsx
                  </div>
                  <div className="theme-preview-tab">main.rs</div>
                </div>

                {/* Mini Code Canvas */}
                <div className="theme-preview-code">
                  <div className="theme-preview-line">
                    <span className="theme-preview-ln">1</span>
                    <span style={{ color: colors.accent }}>import</span> React,{" "}
                    <span style={{ color: colors.accent }}>{"{ useState }"}</span>{" "}
                    <span style={{ color: colors.accent }}>from</span> &quot;react&quot;;
                  </div>

                  {/* Active Line with lineHighlightBackground & selectionBackground */}
                  <div
                    className="theme-preview-line theme-preview-line--highlight"
                    style={{
                      backgroundColor: colors["editor.lineHighlightBackground"],
                    }}
                  >
                    <span className="theme-preview-ln">2</span>
                    <span>
                      <span style={{ color: colors.accent }}>export</span> function Counter() &#123;
                    </span>
                  </div>

                  <div className="theme-preview-line">
                    <span className="theme-preview-ln">3</span>
                    <span>
                      &nbsp;&nbsp;const [
                      <span
                        className="theme-preview-selection"
                        style={{
                          backgroundColor: colors["editor.selectionBackground"],
                        }}
                      >
                        themeCount
                      </span>
                      , setCount] = useState(0);
                    </span>
                  </div>

                  <div className="theme-preview-line">
                    <span className="theme-preview-ln">4</span>
                    <span>
                      &nbsp;&nbsp;<span style={{ color: colors.accent }}>return</span> &lt;
                      <span style={{ color: colors.accent }}>button</span>&gt;Morsel: &#123;themeCount&#125;&lt;/
                      <span style={{ color: colors.accent }}>button</span>&gt;;
                    </span>
                  </div>

                  <div className="theme-preview-line">
                    <span className="theme-preview-ln">5</span>
                    <span>&#125;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div
              className="theme-preview-statusbar"
              style={{
                backgroundColor: colors["statusBar.background"],
                color: colors["statusBar.foreground"],
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div className="theme-preview-statusbar-group">
                <span>⎇ main</span>
                <span>Ln 3, Col 12</span>
              </div>
              <div className="theme-preview-statusbar-group">
                <span>TypeScript</span>
                <span
                  className="theme-preview-statusbar-badge"
                  style={{ backgroundColor: colors.accent }}
                >
                  ✓ Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export JSON Modal */}
      {exportOpen && (
        <div
          className="theme-editor-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Export Theme JSON"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportOpen(false);
          }}
        >
          <div className="theme-editor-modal island">
            <div className="theme-editor-modal__header">
              <h4>Export Theme JSON</h4>
              <button
                type="button"
                className="theme-editor__btn theme-editor__btn--ghost"
                onClick={() => setExportOpen(false)}
                aria-label="Close modal"
              >
                <X size={14} />
              </button>
            </div>
            <p className="theme-editor-modal__desc">
              This JSON conforms to the extension <code>contributes.themes</code> schema and can be imported into Morsel or distributed in extension packages.
            </p>
            <textarea
              readOnly
              value={currentExportJson}
              className="theme-editor-modal__textarea"
              aria-label="Exported JSON"
            />
            <div className="theme-editor-modal__actions">
              <button
                type="button"
                className="theme-editor__btn"
                onClick={handleCopyExport}
              >
                {exportCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{exportCopied ? "Copied!" : "Copy JSON"}</span>
              </button>
              <button
                type="button"
                className="theme-editor__btn theme-editor__btn--primary"
                onClick={handleDownloadExport}
              >
                <Download size={13} />
                <span>Download .json</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {importOpen && (
        <div
          className="theme-editor-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Import Theme JSON"
          onClick={(e) => {
            if (e.target === e.currentTarget) setImportOpen(false);
          }}
        >
          <div className="theme-editor-modal island">
            <div className="theme-editor-modal__header">
              <h4>Import Theme from JSON</h4>
              <button
                type="button"
                className="theme-editor__btn theme-editor__btn--ghost"
                onClick={() => setImportOpen(false)}
                aria-label="Close modal"
              >
                <X size={14} />
              </button>
            </div>
            <p className="theme-editor-modal__desc">
              Paste a theme JSON object or extension <code>contributes.themes</code> definition to import colors.
            </p>
            {importError && (
              <div className="theme-editor-modal__error" role="alert">
                {importError}
              </div>
            )}
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder='{ "id": "my-theme", "label": "My Theme", "uiTheme": "vs-dark", "colors": { ... } }'
              className="theme-editor-modal__textarea"
              aria-label="Theme JSON to import"
            />
            <div className="theme-editor-modal__actions">
              <button
                type="button"
                className="theme-editor__btn"
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="theme-editor__btn theme-editor__btn--primary"
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
              >
                <Upload size={13} />
                <span>Import and Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
