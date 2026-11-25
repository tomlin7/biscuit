use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionContributes {
    #[serde(default)]
    pub commands: Vec<ExtensionCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionCommand {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: String,
    pub enabled: bool,
    pub path: String,
    #[serde(default)]
    pub contributes: Option<ExtensionContributes>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct EnabledMap {
    #[serde(default)]
    enabled: std::collections::HashMap<String, bool>,
}

fn extensions_root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("extensions");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn state_path(root: &Path) -> PathBuf {
    root.join(".enabled.json")
}

fn load_enabled(root: &Path) -> EnabledMap {
    let path = state_path(root);
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => EnabledMap::default(),
    }
}

fn save_enabled(root: &Path, map: &EnabledMap) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    fs::write(state_path(root), raw).map_err(|e| e.to_string())
}

fn read_manifest(dir: &Path, enabled_map: &EnabledMap) -> Option<ExtensionManifest> {
    let manifest_path = dir.join("extension.json");
    let raw = fs::read_to_string(manifest_path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let id = value
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            dir.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string()
        });
    let name = value
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&id)
        .to_string();
    let version = value
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("0.0.0")
        .to_string();
    let description = value
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let contributes = value
        .get("contributes")
        .cloned()
        .and_then(|v| serde_json::from_value(v).ok());
    let enabled = enabled_map.enabled.get(&id).copied().unwrap_or(true);
    Some(ExtensionManifest {
        id,
        name,
        version,
        description,
        enabled,
        path: dir.to_string_lossy().to_string(),
        contributes,
    })
}

#[tauri::command]
pub fn list_extensions(app: AppHandle) -> Result<Vec<ExtensionManifest>, String> {
    let root = extensions_root(&app)?;
    let enabled_map = load_enabled(&root);
    let mut out = Vec::new();
    let entries = fs::read_dir(&root).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if let Some(manifest) = read_manifest(&path, &enabled_map) {
            out.push(manifest);
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[tauri::command]
pub fn set_extension_enabled(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let root = extensions_root(&app)?;
    let mut map = load_enabled(&root);
    map.enabled.insert(id, enabled);
    save_enabled(&root, &map)
}

#[tauri::command]
pub fn install_sample_extension(app: AppHandle) -> Result<(), String> {
    let root = extensions_root(&app)?;
    let dir = root.join("t3d.sample-hello");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let manifest = r#"{
  "id": "t3d.sample-hello",
  "name": "Sample Hello",
  "version": "1.0.0",
  "description": "Sample extension that contributes a Hello command to the palette.",
  "contributes": {
    "commands": [
      { "id": "sample.hello", "title": "Sample: Say Hello" }
    ]
  }
}
"#;
    fs::write(dir.join("extension.json"), manifest).map_err(|e| e.to_string())?;
    let mut map = load_enabled(&root);
    map.enabled.insert("t3d.sample-hello".into(), true);
    save_enabled(&root, &map)?;
    Ok(())
}
