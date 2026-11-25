use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub struct PtySession {
    writer: Mutex<Box<dyn Write + Send>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
}

pub struct PtyState {
    sessions: Mutex<HashMap<String, Arc<PtySession>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct PtyDataPayload {
    id: String,
    data: String,
}

#[derive(Clone, serde::Serialize)]
struct PtyExitPayload {
    id: String,
}

struct ShellLaunch {
    program: String,
    args: Vec<String>,
}

fn resolve_shell(shell: Option<&str>) -> Result<ShellLaunch, String> {
    match shell.map(str::trim).filter(|value| !value.is_empty()) {
        None => Ok(default_launch()),
        Some("powershell") => Ok(ShellLaunch {
            program: "powershell.exe".into(),
            args: vec!["-NoLogo".into()],
        }),
        Some("cmd") => Ok(ShellLaunch {
            program: "cmd.exe".into(),
            args: Vec::new(),
        }),
        Some("bash") => Ok(ShellLaunch {
            program: "bash".into(),
            args: Vec::new(),
        }),
        Some(other) => Err(format!("unsupported shell: {other}")),
    }
}

fn default_launch() -> ShellLaunch {
    #[cfg(target_os = "windows")]
    {
        ShellLaunch {
            program: "powershell.exe".into(),
            args: vec!["-NoLogo".into()],
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        ShellLaunch {
            program: std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into()),
            args: Vec::new(),
        }
    }
}

fn command_from(launch: ShellLaunch) -> CommandBuilder {
    let mut cmd = CommandBuilder::new(launch.program);
    for arg in launch.args {
        cmd.arg(arg);
    }
    cmd
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    shell: Option<String>,
) -> Result<String, String> {
    let launch = resolve_shell(shell.as_deref())?;
    let mut cmd = command_from(launch);
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    spawn_in_pty(app, state, cmd, cols, rows)
}

#[tauri::command]
pub fn pty_run_file(
    app: AppHandle,
    state: State<'_, PtyState>,
    path: String,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let spec = crate::debug::launch_spec(&path)?;
    let mut cmd = CommandBuilder::new(spec.program);
    for arg in spec.args {
        cmd.arg(arg);
    }
    cmd.cwd(spec.cwd);
    spawn_in_pty(app, state, cmd, cols, rows)
}

fn spawn_in_pty(
    app: AppHandle,
    state: State<'_, PtyState>,
    cmd: CommandBuilder,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;
    let killer = child.clone_killer();

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| e.to_string())?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let session = Arc::new(PtySession {
        writer: Mutex::new(writer),
        master: Mutex::new(pair.master),
        killer: Mutex::new(killer),
    });

    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), Arc::clone(&session));

    let app_data = app.clone();
    let id_data = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_data.emit(
                        "pty-data",
                        PtyDataPayload {
                            id: id_data.clone(),
                            data: chunk,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app_data.emit("pty-exit", PtyExitPayload { id: id_data });
    });

    std::thread::spawn(move || {
        let _ = child.wait();
    });

    Ok(id)
}

#[tauri::command]
pub fn pty_write(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or_else(|| "unknown pty".to_string())?;
    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or_else(|| "unknown pty".to_string())?;
    let master = session.master.lock().map_err(|e| e.to_string())?;
    master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_kill(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.remove(&id) {
        let mut killer = session.killer.lock().map_err(|e| e.to_string())?;
        let _ = killer.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::resolve_shell;

    #[test]
    fn shell_allowlist() {
        assert_eq!(resolve_shell(None).unwrap().program, resolve_shell(Some("")).unwrap().program);
        assert_eq!(resolve_shell(Some("powershell")).unwrap().program, "powershell.exe");
        assert_eq!(resolve_shell(Some("cmd")).unwrap().program, "cmd.exe");
        assert_eq!(resolve_shell(Some("bash")).unwrap().program, "bash");
        assert!(resolve_shell(Some("calc.exe")).is_err());
        assert!(resolve_shell(Some("powershell.exe")).is_err());
    }
}
