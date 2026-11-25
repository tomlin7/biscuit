use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionThemeColors {
    #[serde(default)]
    pub bg: String,
    #[serde(default)]
    pub fg: String,
    #[serde(default)]
    pub accent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionTheme {
    pub id: String,
    pub label: String,
    pub mode: String,
    pub colors: ExtensionThemeColors,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionLanguage {
    pub id: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionContributes {
    #[serde(default)]
    pub commands: Vec<ExtensionCommand>,
    #[serde(default)]
    pub themes: Vec<ExtensionTheme>,
    #[serde(default)]
    pub languages: Vec<ExtensionLanguage>,
    #[serde(default)]
    pub webviews: Vec<ExtensionWebview>,
}

/// An HTML page, relative to the extension folder, shown in a sandboxed editor tab.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionWebview {
    pub id: String,
    pub title: String,
    pub entry: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionCommand {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub runs: Option<String>,
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
    /// Entry module, relative to the extension folder, run in the extension host.
    #[serde(default)]
    pub main: Option<String>,
    #[serde(default, rename = "activationEvents")]
    pub activation_events: Vec<String>,
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

fn string_list(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(|item| item.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|text| text.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn parse_contributes(value: &serde_json::Value) -> ExtensionContributes {
    let Some(obj) = value.get("contributes").and_then(|item| item.as_object()) else {
        return ExtensionContributes::default();
    };
    let mut out = ExtensionContributes::default();
    if let Some(commands) = obj.get("commands").and_then(|item| item.as_array()) {
        for item in commands {
            let Some(id) = item.get("id").and_then(|part| part.as_str()).filter(|id| !id.is_empty()) else {
                continue;
            };
            let Some(title) = item.get("title").and_then(|part| part.as_str()) else {
                continue;
            };
            let runs = item
                .get("runs")
                .and_then(|part| part.as_str())
                .map(|value| value.to_string());
            out.commands.push(ExtensionCommand {
                id: id.to_string(),
                title: title.to_string(),
                runs,
            });
        }
    }
    if let Some(themes) = obj.get("themes").and_then(|item| item.as_array()) {
        for item in themes {
            let Some(id) = item.get("id").and_then(|part| part.as_str()).filter(|id| !id.is_empty()) else {
                continue;
            };
            let label = item
                .get("label")
                .and_then(|part| part.as_str())
                .filter(|label| !label.is_empty())
                .unwrap_or(id);
            let mode = if item.get("mode").and_then(|part| part.as_str()) == Some("light") {
                "light"
            } else {
                "dark"
            };
            let colors = item.get("colors");
            let color = |key: &str| {
                colors
                    .and_then(|entry| entry.get(key))
                    .and_then(|part| part.as_str())
                    .unwrap_or("")
                    .to_string()
            };
            out.themes.push(ExtensionTheme {
                id: id.to_string(),
                label: label.to_string(),
                mode: mode.to_string(),
                colors: ExtensionThemeColors {
                    bg: color("bg"),
                    fg: color("fg"),
                    accent: color("accent"),
                },
            });
        }
    }
    if let Some(languages) = obj.get("languages").and_then(|item| item.as_array()) {
        for item in languages {
            let Some(id) = item.get("id").and_then(|part| part.as_str()).filter(|id| !id.is_empty()) else {
                continue;
            };
            out.languages.push(ExtensionLanguage {
                id: id.to_string(),
                aliases: string_list(item.get("aliases")),
                extensions: string_list(item.get("extensions")),
            });
        }
    }
    if let Some(webviews) = obj.get("webviews").and_then(|item| item.as_array()) {
        for item in webviews {
            let text = |key: &str| {
                item.get(key)
                    .and_then(|part| part.as_str())
                    .map(|value| value.trim())
                    .filter(|value| !value.is_empty())
            };
            let (Some(id), Some(entry)) = (text("id"), text("entry")) else {
                continue;
            };
            out.webviews.push(ExtensionWebview {
                id: id.to_string(),
                title: text("title").unwrap_or(id).to_string(),
                entry: entry.to_string(),
            });
        }
    }
    out
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
    let parsed = parse_contributes(&value);
    let contributes = if parsed.commands.is_empty()
        && parsed.themes.is_empty()
        && parsed.languages.is_empty()
        && parsed.webviews.is_empty()
    {
        None
    } else {
        Some(parsed)
    };
    let main = value
        .get("main")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let activation_events = string_list(value.get("activationEvents"));
    let enabled = enabled_map.enabled.get(&id).copied().unwrap_or(true);
    Some(ExtensionManifest {
        id,
        name,
        version,
        description,
        enabled,
        path: dir.to_string_lossy().to_string(),
        contributes,
        main,
        activation_events,
    })
}

const MAX_EXTENSION_FILE: u64 = 16 * 1024 * 1024;

/// Resolves `relative` inside the installed extension `id`, refusing anything that escapes it.
pub fn extension_file_path(root: &Path, id: &str, relative: &str) -> Result<PathBuf, String> {
    valid_extension_id(id)?;
    let relative = relative.trim_start_matches(['/', '\\']);
    if relative.is_empty() {
        return Err("extension file path is empty".into());
    }
    let base = root
        .join(id)
        .canonicalize()
        .map_err(|_| format!("extension {id} is not installed"))?;
    let file = base
        .join(relative)
        .canonicalize()
        .map_err(|_| format!("{relative} was not found in {id}"))?;
    if !file.starts_with(&base) || !file.is_file() {
        return Err(format!("{relative} is not a file inside {id}"));
    }
    let size = fs::metadata(&file).map_err(|e| e.to_string())?.len();
    if size > MAX_EXTENSION_FILE {
        return Err(format!("{relative} is larger than 16 MB"));
    }
    Ok(file)
}

fn guess_mime(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "wasm" => "application/wasm",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        _ => "application/octet-stream",
    }
}

pub fn handle_t3dext(
    app: &tauri::AppHandle,
    req: tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    let uri = req.uri();
    let (ext_id, rel_path) = match uri.host() {
        Some(host) if host != "localhost" && !host.is_empty() => {
            (host, uri.path().trim_start_matches('/'))
        }
        _ => {
            let trimmed = uri.path().trim_start_matches('/');
            let mut parts = trimmed.splitn(2, '/');
            let ext = parts.next().unwrap_or("");
            let path = parts.next().unwrap_or("");
            (ext, path)
        }
    };

    let root = match extensions_root(app) {
        Ok(r) => r,
        Err(e) => {
            return tauri::http::Response::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(e.into_bytes())
                .unwrap();
        }
    };

    let file = match extension_file_path(&root, ext_id, rel_path) {
        Ok(f) => f,
        Err(e) => {
            return tauri::http::Response::builder()
                .status(404)
                .header("Content-Type", "text/plain")
                .body(e.into_bytes())
                .unwrap();
        }
    };

    let bytes = match fs::read(&file) {
        Ok(b) => b,
        Err(e) => {
            return tauri::http::Response::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(e.to_string().into_bytes())
                .unwrap();
        }
    };

    let mime = guess_mime(&file);
    tauri::http::Response::builder()
        .header("Content-Type", mime)
        .header("Access-Control-Allow-Origin", "*")
        .body(bytes)
        .unwrap()
}

#[tauri::command]
pub fn read_extension_file(app: AppHandle, id: String, path: String) -> Result<String, String> {
    let root = extensions_root(&app)?;
    let file = extension_file_path(&root, &id, &path)?;
    fs::read_to_string(file).map_err(|e| e.to_string())
}

fn ensure_builtin_extensions(root: &Path) {
    let games_dir = root.join("t3d.games");
    if !games_dir.exists() {
        let _ = fs::create_dir_all(games_dir.join("webviews"));
        let manifest = include_str!("../../extensions/t3d.games/extension.json");
        let main = include_str!("../../extensions/t3d.games/main.js");
        let common_css = include_str!("../../extensions/t3d.games/webviews/common.css");
        let theme_js = include_str!("../../extensions/t3d.games/webviews/theme.js");
        let tictactoe_html = include_str!("../../extensions/t3d.games/webviews/tictactoe.html");
        let gameoflife_html = include_str!("../../extensions/t3d.games/webviews/gameoflife.html");
        let minesweeper_html = include_str!("../../extensions/t3d.games/webviews/minesweeper.html");
        let pong_html = include_str!("../../extensions/t3d.games/webviews/pong.html");
        let whoops_html = include_str!("../../extensions/t3d.games/webviews/whoops.html");

        let _ = fs::write(games_dir.join("extension.json"), manifest);
        let _ = fs::write(games_dir.join("main.js"), main);
        let _ = fs::write(games_dir.join("webviews").join("common.css"), common_css);
        let _ = fs::write(games_dir.join("webviews").join("theme.js"), theme_js);
        let _ = fs::write(games_dir.join("webviews").join("tictactoe.html"), tictactoe_html);
        let _ = fs::write(games_dir.join("webviews").join("gameoflife.html"), gameoflife_html);
        let _ = fs::write(games_dir.join("webviews").join("minesweeper.html"), minesweeper_html);
        let _ = fs::write(games_dir.join("webviews").join("pong.html"), pong_html);
        let _ = fs::write(games_dir.join("webviews").join("whoops.html"), whoops_html);
    }

    let keypress_dir = root.join("t3d.keypress-display");
    if !keypress_dir.exists() {
        let _ = fs::create_dir_all(&keypress_dir);
        let manifest = include_str!("../../extensions/t3d.keypress-display/extension.json");
        let main = include_str!("../../extensions/t3d.keypress-display/main.js");
        let _ = fs::write(keypress_dir.join("extension.json"), manifest);
        let _ = fs::write(keypress_dir.join("main.js"), main);
    }
}

#[tauri::command]
pub fn list_extensions(app: AppHandle) -> Result<Vec<ExtensionManifest>, String> {
    let root = extensions_root(&app)?;
    ensure_builtin_extensions(&root);
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

fn valid_extension_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 128 {
        return Err("extension id is empty or too long".into());
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_')
    {
        return Err(
            "extension id may only use letters, digits, dot, dash, and underscore".into(),
        );
    }
    if id.starts_with('.') || id.contains("..") {
        return Err("extension id is not a folder name".into());
    }
    Ok(())
}

fn require_manifest_id(dir: &Path) -> Result<String, String> {
    let path = dir.join("extension.json");
    let raw = fs::read_to_string(&path).map_err(|_| "extension.json is missing".to_string())?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|_| "extension.json is not valid JSON".to_string())?;
    let id = value
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "extension.json needs a string id".to_string())?;
    valid_extension_id(id)?;
    Ok(id.to_string())
}

fn copy_dir(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir(&from, &to)?;
        } else {
            if let Some(parent) = to.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::copy(&from, &to).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn install_extension_from(source: &Path, root: &Path) -> Result<String, String> {
    if !source.is_dir() {
        return Err("pick a folder".into());
    }
    let id = require_manifest_id(source)?;
    let src = source.canonicalize().map_err(|e| e.to_string())?;
    let root_canon = root.canonicalize().map_err(|e| e.to_string())?;
    let dest = root_canon.join(&id);
    if dest.starts_with(&src) {
        return Err("that folder contains the extensions directory".into());
    }
    let already = dest.exists()
        && dest
            .canonicalize()
            .map(|path| path == src)
            .unwrap_or(false);
    if !already {
        if dest.exists() {
            fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
        }
        copy_dir(&src, &dest)?;
    }
    let mut map = load_enabled(&root_canon);
    map.enabled.insert(id.clone(), true);
    save_enabled(&root_canon, &map)?;
    Ok(id)
}

pub fn scaffold_extension_at(dest: &Path) -> Result<String, String> {
    if !dest.is_dir() {
        return Err("pick a folder".into());
    }
    let manifest = dest.join("extension.json");
    if manifest.exists() {
        return Err("extension.json already exists".into());
    }
    let folder = dest
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("local.extension");
    let id = if valid_extension_id(folder).is_ok() {
        folder.to_string()
    } else {
        "local.extension".to_string()
    };
    let name = if folder.is_empty() {
        "Local Extension".to_string()
    } else {
        folder.to_string()
    };
    let command = format!("{id}.hello");
    let body = serde_json::to_string_pretty(&serde_json::json!({
        "id": id,
        "name": name,
        "version": "0.1.0",
        "description": "",
        "main": "main.js",
        "contributes": {
            "commands": [{ "id": command, "title": format!("{name}: Say Hello") }]
        }
    }))
    .map_err(|e| e.to_string())?;
    fs::write(manifest, body).map_err(|e| e.to_string())?;
    let main = dest.join("main.js");
    if !main.exists() {
        fs::write(main, sample_main_js(&command, &name)).map_err(|e| e.to_string())?;
    }
    Ok(id)
}

fn sample_main_js(command: &str, name: &str) -> String {
    let command = serde_json::to_string(command).unwrap_or_else(|_| "\"hello\"".into());
    let greeting = serde_json::to_string(&format!("Hello from {name}!"))
        .unwrap_or_else(|_| "\"Hello!\"".into());
    format!(
        r#"// Runs in the T3D extension host (a Web Worker) the first time the command is used.
export function activate(t3d, context) {{
  context.subscriptions.push(
    t3d.commands.registerCommand({command}, async () => {{
      const state = await t3d.workspace.getState();
      const file = state.activeDocument ? ` You are editing ${{state.activeDocument.title}}.` : "";
      await t3d.window.showInformationMessage({greeting} + file);
    }}),
  );
}}

export function deactivate() {{}}
"#
    )
}

#[tauri::command]
pub fn install_local_extension(app: AppHandle, source: String) -> Result<String, String> {
    let root = extensions_root(&app)?;
    install_extension_from(Path::new(&source), &root)
}

#[tauri::command]
pub fn scaffold_extension(dest: String) -> Result<String, String> {
    scaffold_extension_at(Path::new(&dest))
}

#[tauri::command]
pub fn install_sample_extension(app: AppHandle) -> Result<(), String> {
    let root = extensions_root(&app)?;
    let dir = root.join("t3d.sample-hello");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let manifest = r#"{
  "id": "t3d.sample-hello",
  "name": "Sample Hello",
  "version": "1.1.0",
  "description": "Sample extension that contributes a Hello command to the palette.",
  "main": "main.js",
  "contributes": {
    "commands": [
      { "id": "sample.hello", "title": "Sample: Say Hello" }
    ]
  }
}
"#;
    fs::write(dir.join("extension.json"), manifest).map_err(|e| e.to_string())?;
    fs::write(dir.join("main.js"), sample_main_js("sample.hello", "Sample Hello"))
        .map_err(|e| e.to_string())?;
    let mut map = load_enabled(&root);
    map.enabled.insert("t3d.sample-hello".into(), true);
    save_enabled(&root, &map)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{install_extension_from, require_manifest_id, scaffold_extension_at};
    use std::fs;

    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("t3d-ext-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn rejects_a_folder_without_a_manifest() {
        let dir = scratch("missing");
        let err = require_manifest_id(&dir).unwrap_err();
        assert!(err.contains("missing"), "{err}");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_an_invalid_manifest() {
        let dir = scratch("bad");
        fs::write(dir.join("extension.json"), "{").unwrap();
        let err = require_manifest_id(&dir).unwrap_err();
        assert!(err.contains("not valid JSON"), "{err}");
        fs::write(dir.join("extension.json"), "{\"name\":\"x\"}").unwrap();
        let err = require_manifest_id(&dir).unwrap_err();
        assert!(err.contains("string id"), "{err}");
        fs::write(dir.join("extension.json"), "{\"id\":\"../x\"}").unwrap();
        assert!(require_manifest_id(&dir).is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn copies_a_local_extension_and_enables_it() {
        let root = scratch("root");
        let source = scratch("source");
        fs::create_dir_all(source.join("extra")).unwrap();
        fs::write(
            source.join("extension.json"),
            "{\"id\":\"local.demo\",\"name\":\"Demo\"}",
        )
        .unwrap();
        fs::write(source.join("extra").join("note.txt"), "hello").unwrap();
        let id = install_extension_from(&source, &root).unwrap();
        assert_eq!(id, "local.demo");
        let installed = root.join("local.demo");
        assert_eq!(
            fs::read_to_string(installed.join("extra").join("note.txt")).unwrap(),
            "hello"
        );
        let enabled = fs::read_to_string(root.join(".enabled.json")).unwrap();
        assert!(enabled.contains("local.demo"));
        fs::write(source.join("extra").join("note.txt"), "again").unwrap();
        install_extension_from(&source, &root).unwrap();
        assert_eq!(
            fs::read_to_string(installed.join("extra").join("note.txt")).unwrap(),
            "again"
        );
        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&source);
    }

    #[test]
    fn scaffold_writes_once() {
        let parent = scratch("scaffold-parent");
        let dir = parent.join("scaffold.demo");
        fs::create_dir_all(&dir).unwrap();
        let id = scaffold_extension_at(&dir).unwrap();
        assert_eq!(id, "scaffold.demo");
        let raw = fs::read_to_string(dir.join("extension.json")).unwrap();
        assert!(raw.contains("\"id\": \"scaffold.demo\""));
        let err = scaffold_extension_at(&dir).unwrap_err();
        assert!(err.contains("already exists"), "{err}");
        let _ = fs::remove_dir_all(&parent);
    }

    #[test]
    fn skips_a_theme_without_an_id() {
        let value = serde_json::json!({
            "contributes": {
                "commands": [{ "id": "demo.hello", "title": "Hello" }],
                "themes": [
                    { "label": "Broken" },
                    { "id": "moss", "label": "Moss", "mode": "dark", "colors": { "bg": "#123456", "fg": "#eeeeee", "accent": "#22aa66" } }
                ],
                "languages": [{ "id": "todo", "aliases": ["Todo"], "extensions": [".todo"] }]
            }
        });
        let parsed = super::parse_contributes(&value);
        assert_eq!(parsed.commands.len(), 1);
        assert_eq!(parsed.themes.len(), 1);
        assert_eq!(parsed.themes[0].id, "moss");
        assert_eq!(parsed.themes[0].colors.bg, "#123456");
        assert_eq!(parsed.languages[0].extensions, vec![".todo"]);
    }

    #[test]
    fn reads_a_command_runs_action() {
        let value = serde_json::json!({
            "contributes": {
                "commands": [
                    { "id": "demo.open", "title": "Open", "runs": "open-folder" },
                    { "id": "demo.plain", "title": "Plain" }
                ]
            }
        });
        let parsed = super::parse_contributes(&value);
        assert_eq!(parsed.commands[0].runs.as_deref(), Some("open-folder"));
        assert_eq!(parsed.commands[1].runs, None);
    }

    #[test]
    fn reads_webview_contributions() {
        let value = serde_json::json!({
            "contributes": {
                "webviews": [
                    { "id": "board", "title": "Board", "entry": "views/board.html" },
                    { "id": "untitled", "entry": "views/u.html" },
                    { "id": "broken", "title": "No entry" }
                ]
            }
        });
        let parsed = super::parse_contributes(&value);
        assert_eq!(parsed.webviews.len(), 2);
        assert_eq!(parsed.webviews[0].entry, "views/board.html");
        assert_eq!(parsed.webviews[1].title, "untitled");
    }

    #[test]
    fn test_guess_mime() {
        use std::path::Path;
        assert_eq!(super::guess_mime(Path::new("index.html")), "text/html; charset=utf-8");
        assert_eq!(super::guess_mime(Path::new("app.js")), "application/javascript; charset=utf-8");
        assert_eq!(super::guess_mime(Path::new("style.css")), "text/css; charset=utf-8");
    }

    #[test]
    fn extension_files_stay_inside_their_folder() {
        let root = scratch("file-root");
        let ext = root.join("local.files");
        fs::create_dir_all(ext.join("dist")).unwrap();
        fs::write(ext.join("dist").join("main.js"), "export {}").unwrap();
        fs::write(root.join("secret.txt"), "nope").unwrap();
        let ok = super::extension_file_path(&root, "local.files", "dist/main.js").unwrap();
        assert!(ok.ends_with("main.js"));
        assert!(super::extension_file_path(&root, "local.files", "../secret.txt").is_err());
        assert!(super::extension_file_path(&root, "local.files", "dist").is_err());
        assert!(super::extension_file_path(&root, "../local.files", "dist/main.js").is_err());
        let _ = fs::remove_dir_all(&root);
    }
}
