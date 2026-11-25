use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, ChildStderr, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use uuid::Uuid;

const DEBUG_HELPER: &str = include_str!("debug_helper.py");

struct PySession {
    child: Child,
    #[allow(dead_code)]
    stdin: ChildStdin,
    stderr: BufReader<ChildStderr>,
}

pub struct DebugState {
    sessions: Mutex<HashMap<String, Child>>,
    python: Mutex<HashMap<String, PySession>>,
}

impl Default for DebugState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            python: Mutex::new(HashMap::new()),
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
    let mut python = state.python.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = python.remove(&id) {
        let _ = session.child.kill();
        let _ = session.child.wait();
    }
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PyBreak {
    pub file: String,
    pub line: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PyFrame {
    pub name: String,
    pub file: String,
    pub line: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PyStop {
    pub id: String,
    pub event: String,
    pub frames: Vec<PyFrame>,
    pub locals: HashMap<String, String>,
}

fn helper_file() -> Result<std::path::PathBuf, String> {
    let path = std::env::temp_dir().join("t3d-debug-helper.py");
    std::fs::write(&path, DEBUG_HELPER).map_err(|err| err.to_string())?;
    Ok(path)
}

fn read_debug_event(stderr: &mut BufReader<ChildStderr>) -> Result<serde_json::Value, String> {
    for _ in 0..40 {
        let mut line = String::new();
        let read = stderr.read_line(&mut line).map_err(|err| err.to_string())?;
        if read == 0 {
            return Err("debugger closed its event stream".into());
        }
        let trimmed = line.trim();
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if value.get("event").is_some() {
                return Ok(value);
            }
        }
    }
    Err("debugger produced no event".into())
}

fn stop_from_event(id: String, value: serde_json::Value) -> Result<PyStop, String> {
    let event = value
        .get("event")
        .and_then(|item| item.as_str())
        .unwrap_or("")
        .to_string();
    if event == "error" {
        let message = value
            .get("message")
            .and_then(|item| item.as_str())
            .unwrap_or("debugpy failed");
        return Err(message.to_string());
    }
    let frames = value
        .get("frames")
        .and_then(|item| item.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|frame| {
                    Some(PyFrame {
                        name: frame.get("name")?.as_str()?.to_string(),
                        file: frame.get("file")?.as_str()?.to_string(),
                        line: frame.get("line")?.as_u64()? as u32,
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let locals = value
        .get("locals")
        .and_then(|item| item.as_object())
        .map(|map| {
            map.iter()
                .map(|(key, item)| {
                    (
                        key.clone(),
                        item.as_str().map(|text| text.to_string()).unwrap_or_else(|| item.to_string()),
                    )
                })
                .collect()
        })
        .unwrap_or_default();
    Ok(PyStop {
        id,
        event,
        frames,
        locals,
    })
}

fn spawn_python_debug(
    python: &str,
    script: &str,
    breakpoints: &[PyBreak],
) -> Result<(PySession, serde_json::Value), String> {
    let helper = helper_file()?;
    let spec = serde_json::to_string(breakpoints).map_err(|err| err.to_string())?;
    let mut child = Command::new(python)
        .arg(&helper)
        .arg(script)
        .arg(spec)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| format!("Failed to launch Python: {err}"))?;
    let stdin = child.stdin.take().ok_or("debugger stdin was not piped")?;
    let stderr = BufReader::new(child.stderr.take().ok_or("debugger stderr was not piped")?);
    let mut session = PySession {
        child,
        stdin,
        stderr,
    };
    let event = read_debug_event(&mut session.stderr)?;
    Ok((session, event))
}

#[tauri::command]
pub fn debug_py_start(
    state: tauri::State<'_, DebugState>,
    path: String,
    breakpoints: Vec<PyBreak>,
) -> Result<PyStop, String> {
    if !path.to_ascii_lowercase().ends_with(".py") {
        return Err("Python variables are available for .py files.".into());
    }
    let python = if cfg!(windows) { "python" } else { "python3" };
    let (session, event) = spawn_python_debug(python, &path, &breakpoints)?;
    let id = Uuid::new_v4().to_string();
    let stop = match stop_from_event(id.clone(), event) {
        Ok(stop) => stop,
        Err(err) => {
            let mut session = session;
            let _ = session.child.kill();
            return Err(err);
        }
    };
    if stop.event == "stopped" {
        state
            .python
            .lock()
            .map_err(|err| err.to_string())?
            .insert(id, session);
    } else {
        let mut session = session;
        let _ = session.child.kill();
    }
    Ok(stop)
}

#[cfg(test)]
mod tests {
    use super::{launch_spec, spawn_python_debug, stop_from_event, PyBreak};

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

    #[test]
    fn missing_debugpy_is_an_error() {
        let dir = std::env::temp_dir().join(format!("t3d-pydebug-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let script = dir.join("hi.py");
        std::fs::write(&script, "value = 1\n").unwrap();
        let python = if cfg!(windows) { "python" } else { "python3" };
        let (mut session, event) =
            spawn_python_debug(python, &script.to_string_lossy(), &[]).unwrap();
        let err = stop_from_event("id".into(), event).unwrap_err();
        assert!(err.to_lowercase().contains("debugpy"), "{err}");
        let _ = session.child.kill();
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn debugpy_stops_with_a_local() {
        let python = std::env::temp_dir()
            .join("t3d-debugpy-venv")
            .join("Scripts")
            .join("python.exe");
        if !python.exists() {
            return;
        }
        let dir = std::env::temp_dir().join(format!("t3d-pystop-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let script = dir.join("sample.py");
        std::fs::write(&script, "def add(left, right):\n    total = left + right\n    return total\n\nadd(2, 3)\n").unwrap();
        let (mut session, event) = spawn_python_debug(
            &python.to_string_lossy(),
            &script.to_string_lossy(),
            &[PyBreak {
                file: script.to_string_lossy().to_string(),
                line: 2,
            }],
        )
        .unwrap();
        let stop = stop_from_event("test".into(), event).unwrap();
        assert_eq!(stop.event, "stopped");
        assert_eq!(stop.frames[0].name, "add");
        assert_eq!(stop.locals.get("left").map(String::as_str), Some("2"));
        let _ = session.child.kill();
        let _ = std::fs::remove_dir_all(&dir);
    }
}
