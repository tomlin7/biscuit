mod pty;
mod git;
mod extensions;
mod debug;
mod fsops;
mod notifications;
mod system;

use debug::{debug_launch, debug_py_command, debug_py_start, debug_stop, DebugState};
use extensions::{
    handle_t3dext, install_local_extension, install_remote_extension, install_sample_extension,
    list_extensions, read_extension_file, scaffold_extension, set_extension_enabled,
    uninstall_extension,
};
use fsops::{fs_create_file, fs_mkdir, fs_remove, fs_rename};
use git::{
    git_branches, git_can_amend, git_checkout, git_clone, git_commit, git_compare_refs,
    git_create_branch, git_delete_branch, git_diff, git_diff_refs, git_discard, git_fetch,
    git_ignore, git_pull, git_push, git_remote_origin, git_show_head, git_show_ref, git_stage,
    git_stash_pop, git_stash_push, git_summary, git_unstage,
};
use notifications::send_desktop_notification;
use pty::{
    kill_pty_process, list_pty_processes, pty_exec, pty_kill, pty_resize, pty_run_file,
    pty_spawn, pty_write, PtyState,
};
use system::get_memory_usage;

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("t3dext", |ctx, req| handle_t3dext(ctx.app_handle(), req))
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
            list_pty_processes,
            kill_pty_process,
            send_desktop_notification,
            git_summary,
            git_stage,
            git_unstage,
            git_commit,
            git_can_amend,
            git_branches,
            git_checkout,
            git_create_branch,
            git_delete_branch,
            git_clone,
            git_push,
            git_pull,
            git_fetch,
            git_stash_push,
            git_stash_pop,
            git_discard,
            git_diff,
            git_diff_refs,
            git_compare_refs,
            git_show_head,
            git_show_ref,
            git_ignore,
            git_remote_origin,
            list_extensions,
            set_extension_enabled,
            install_sample_extension,
            install_local_extension,
            install_remote_extension,
            uninstall_extension,
            scaffold_extension,
            read_extension_file,
            debug_launch,
            debug_py_start,
            debug_py_command,
            debug_stop,
            fs_create_file,
            fs_mkdir,
            fs_rename,
            fs_remove,
            get_memory_usage,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
