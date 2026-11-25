mod pty;
mod git;

use git::git_summary;
use pty::{pty_kill, pty_resize, pty_spawn, pty_write, PtyState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            git_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
