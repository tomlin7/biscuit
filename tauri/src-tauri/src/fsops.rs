use std::fs;
use std::path::{Path, PathBuf};

fn canonicalize_dir(path: &Path) -> Result<PathBuf, String> {
    path.canonicalize()
        .map_err(|err| format!("cannot resolve {}: {err}", path.display()))
}

fn contained(root: &str, target: &str, must_exist: bool) -> Result<PathBuf, String> {
    let root_canon = canonicalize_dir(Path::new(root))?;
    let target_path = PathBuf::from(target);
    if !target_path.is_absolute() {
        return Err("path must be absolute".into());
    }

    let resolved = if must_exist || target_path.exists() {
        canonicalize_dir(&target_path)?
    } else {
        let parent = target_path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .ok_or_else(|| "missing parent directory".to_string())?;
        let name = target_path
            .file_name()
            .ok_or_else(|| "missing file name".to_string())?;
        canonicalize_dir(parent)?.join(name)
    };

    if !resolved.starts_with(&root_canon) {
        return Err("path is outside the workspace".into());
    }
    Ok(resolved)
}

#[tauri::command]
pub fn fs_create_file(root: String, path: String) -> Result<(), String> {
    let target = contained(&root, &path, false)?;
    if target.exists() {
        return Err("already exists".into());
    }
    fs::write(&target, b"").map_err(|err| err.to_string())
}

#[tauri::command]
pub fn fs_mkdir(root: String, path: String) -> Result<(), String> {
    let target = contained(&root, &path, false)?;
    if target.exists() {
        return Err("already exists".into());
    }
    fs::create_dir(&target).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn fs_rename(root: String, from: String, to: String) -> Result<(), String> {
    let source = contained(&root, &from, true)?;
    let dest = contained(&root, &to, false)?;
    let root_canon = canonicalize_dir(Path::new(&root))?;
    if source == root_canon {
        return Err("cannot rename the workspace root".into());
    }
    if dest.exists() {
        return Err("destination already exists".into());
    }
    fs::rename(&source, &dest).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn fs_remove(root: String, path: String) -> Result<(), String> {
    let target = contained(&root, &path, true)?;
    let root_canon = canonicalize_dir(Path::new(&root))?;
    if target == root_canon {
        return Err("cannot delete the workspace root".into());
    }
    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|err| err.to_string())
    } else {
        fs::remove_file(&target).map_err(|err| err.to_string())
    }
}
