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

#[derive(Debug)]
pub struct LaunchSpec {
    pub program: String,
    pub args: Vec<String>,
    pub cwd: std::path::PathBuf,
}

pub fn launch_spec(path: &str) -> Result<LaunchSpec, String> {
    let file = Path::new(path);
    let ext = file
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    let cwd = file
        .parent()
        .map(|dir| dir.to_path_buf())
        .filter(|dir| !dir.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new(".").to_path_buf());

    let (program, args): (&str, Vec<String>) = match ext.as_str() {
        "js" | "mjs" | "cjs" => ("node", vec![path.to_string()]),
        "ts" => (
            "node",
            vec!["--experimental-strip-types".into(), path.to_string()],
        ),
        "py" => (
            if cfg!(windows) { "python" } else { "python3" },
            vec![path.to_string()],
        ),
        "rs" => {
            return Err(
                "Rust files need a cargo project — open a built binary or use the terminal.".into(),
            );
        }
        "ps1" => (
            "powershell.exe",
            vec!["-NoLogo".into(), "-File".into(), path.to_string()],
        ),
        "sh" | "bash" => ("bash", vec![path.to_string()]),
        _ => {
            #[cfg(windows)]
            {
                ("cmd", vec!["/C".into(), path.to_string()])
            }
            #[cfg(not(windows))]
            {
                (path, Vec::new())
            }
        }
    };

    Ok(LaunchSpec {
        program: program.to_string(),
        args,
        cwd,
    })
}

fn launch_command(path: &str) -> Result<Command, String> {
    let spec = launch_spec(path)?;
    let mut cmd = Command::new(spec.program);
    cmd.args(spec.args);
    cmd.current_dir(spec.cwd);
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

#[cfg(test)]
mod tests {
    use super::launch_spec;

    #[test]
    fn routes_python_and_rejects_rust() {
        let python = launch_spec("notes.py").unwrap();
        assert!(python.program == "python" || python.program == "python3");
        assert_eq!(python.args, vec!["notes.py".to_string()]);
        assert!(launch_spec("main.rs").unwrap_err().contains("cargo"));
        let script = launch_spec("app.ts").unwrap();
        assert_eq!(script.program, "node");
        assert_eq!(script.args[0], "--experimental-strip-types");
    }
}
