mod pty;
mod git;
mod extensions;
mod debug;

use debug::{debug_launch, debug_stop, DebugState};
use extensions::{
    install_sample_extension, list_extensions, set_extension_enabled,
};
use git::git_summary;
use pty::{pty_kill, pty_resize, pty_spawn, pty_write, PtyState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PtyState::default())
        .manage(DebugState::default())
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            git_summary,
            list_extensions,
            set_extension_enabled,
            install_sample_extension,
            debug_launch,
            debug_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
