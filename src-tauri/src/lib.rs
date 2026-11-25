mod pty;
mod git;
mod extensions;
mod debug;
mod fsops;

use debug::{debug_launch, debug_py_command, debug_py_start, debug_stop, DebugState};
use extensions::{
    install_local_extension, install_sample_extension, list_extensions, scaffold_extension,
    set_extension_enabled,
};
use fsops::{fs_create_file, fs_mkdir, fs_remove, fs_rename};
use git::{
    git_branches, git_can_amend, git_checkout, git_clone, git_commit, git_diff, git_discard, git_ignore, git_pull, git_push,
    git_show_head, git_stage,
    git_summary, git_unstage,
};
use pty::{pty_exec, pty_kill, pty_resize, pty_run_file, pty_spawn, pty_write, PtyState};

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
            pty_run_file,
            pty_exec,
            pty_write,
            pty_resize,
            pty_kill,
            git_summary,
            git_stage,
            git_unstage,
            git_commit,
            git_can_amend,
            git_branches,
            git_checkout,
            git_clone,
            git_push,
            git_pull,
            git_discard,
            git_diff,
            git_show_head,
            git_ignore,
            list_extensions,
            set_extension_enabled,
            install_sample_extension,
            install_local_extension,
            scaffold_extension,
            debug_launch,
            debug_py_start,
            debug_py_command,
            debug_stop,
            fs_create_file,
            fs_mkdir,
            fs_rename,
            fs_remove
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
