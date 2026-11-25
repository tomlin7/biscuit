use std::collections::HashMap;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use uuid::Uuid;

pub struct DebugState {
    sessions: Mutex<HashMap<String, Child>>,
}

impl Default for DebugState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

fn launch_command(path: &str) -> Result<Command, String> {
    let p = Path::new(path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let parent = p
        .parent()
        .map(|d| d.to_path_buf())
        .unwrap_or_else(|| Path::new(".").to_path_buf());

    let mut cmd = match ext.as_str() {
        "js" | "mjs" | "cjs" | "ts" => {
            let mut c = Command::new("node");
            if ext == "ts" {
                // Foundation: attempt node; users can point at ts-node later.
                c.arg("--experimental-strip-types");
            }
            c.arg(path);
            c
        }
        "py" => {
            let mut c = Command::new(if cfg!(windows) { "python" } else { "python3" });
            c.arg(path);
            c
        }
        "rs" => {
            return Err("Rust files need a cargo project — open a built binary or use the terminal.".into());
        }
        "ps1" => {
            let mut c = Command::new("powershell.exe");
            c.args(["-NoLogo", "-File", path]);
            c
        }
        "sh" | "bash" => {
            let mut c = Command::new("bash");
            c.arg(path);
            c
        }
        _ => {
            #[cfg(windows)]
            {
                let mut c = Command::new("cmd");
                c.args(["/C", path]);
                c
            }
            #[cfg(not(windows))]
            {
                let mut c = Command::new(path);
                c
            }
        }
    };
    cmd.current_dir(parent);
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());
    Ok(cmd)
}

#[tauri::command]
pub fn debug_launch(state: tauri::State<'_, DebugState>, path: String) -> Result<String, String> {
    let mut cmd = launch_command(&path)?;
    let child = cmd.spawn().map_err(|e| format!("Failed to launch: {e}"))?;
    let id = Uuid::new_v4().to_string();
    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), child);
    Ok(id)
}

#[tauri::command]
pub fn debug_stop(state: tauri::State<'_, DebugState>, id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = sessions.remove(&id) {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}
