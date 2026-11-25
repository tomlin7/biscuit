use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub index: String,
    pub worktree: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitSummary {
    pub branch: String,
    pub entries: Vec<GitStatusEntry>,
    pub ahead: Option<i32>,
    pub behind: Option<i32>,
}

fn run_git(cwd: &str, args: &[String]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if err.is_empty() {
            "git command failed".into()
        } else {
            err
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn describe_status(index: char, worktree: char) -> String {
    match (index, worktree) {
        ('?', '?') => "Untracked".into(),
        ('A', _) => "Added".into(),
        ('M', _) | (_, 'M') => "Modified".into(),
        ('D', _) | (_, 'D') => "Deleted".into(),
        ('R', _) => "Renamed".into(),
        ('C', _) => "Copied".into(),
        ('U', _) | (_, 'U') => "Unmerged".into(),
        _ => format!("{index}{worktree}"),
    }
}

#[tauri::command]
pub fn git_summary(cwd: String) -> Result<GitSummary, String> {
    let branch = run_git(&cwd, &["rev-parse".into(), "--abbrev-ref".into(), "HEAD".into()])?
        .trim()
        .to_string();
    let porcelain = run_git(&cwd, &["status".into(), "--porcelain=v1".into(), "-u".into()])?;
    let mut entries = Vec::new();

    for line in porcelain.lines() {
        if line.len() < 4 {
            continue;
        }
        let index = line.chars().next().unwrap_or(' ');
        let worktree = line.chars().nth(1).unwrap_or(' ');
        let path_part = line[3..].trim();
        let path = if let Some((_, rhs)) = path_part.split_once(" -> ") {
            rhs.to_string()
        } else {
            path_part.to_string()
        };
        entries.push(GitStatusEntry {
            path,
            index: index.to_string(),
            worktree: worktree.to_string(),
            status: describe_status(index, worktree),
        });
    }

    let sync = git_ahead_behind(&cwd);
    Ok(GitSummary {
        branch,
        entries,
        ahead: sync.0,
        behind: sync.1,
    })
}

fn git_ahead_behind(cwd: &str) -> (Option<i32>, Option<i32>) {
    let output = Command::new("git")
        .args(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
        .current_dir(cwd)
        .output();
    let Ok(out) = output else {
        return (None, None);
    };
    if !out.status.success() {
        return (None, None);
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let mut parts = text.trim().split_whitespace();
    let ahead = parts.next().and_then(|v| v.parse().ok());
    let behind = parts.next().and_then(|v| v.parse().ok());
    (ahead, behind)
}

fn git_paths(cwd: &str, verb: &str, extra: &[&str], paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Err("No files selected".into());
    }
    let mut args = vec![verb.to_string()];
    for flag in extra {
        args.push((*flag).to_string());
    }
    args.push("--".into());
    args.extend(paths);
    run_git(cwd, &args)?;
    Ok(())
}

#[tauri::command]
pub fn git_stage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    git_paths(&cwd, "add", &[], paths)
}

#[tauri::command]
pub fn git_unstage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    git_paths(&cwd, "restore", &["--staged"], paths)
}

#[tauri::command]
pub fn git_branches(cwd: String) -> Result<Vec<String>, String> {
    let output = run_git(
        &cwd,
        &["branch".into(), "--format=%(refname:short)".into()],
    )?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

fn valid_branch(branch: &str) -> Result<&str, String> {
    let branch = branch.trim();
    if branch.is_empty()
        || branch.starts_with('-')
        || branch.contains('\n')
        || branch.contains('\0')
    {
        return Err("invalid branch name".into());
    }
    Ok(branch)
}

#[tauri::command]
pub fn git_checkout(cwd: String, branch: String) -> Result<(), String> {
    let branch = valid_branch(&branch)?;
    run_git(&cwd, &["checkout".into(), branch.to_string()])?;
    Ok(())
}

#[tauri::command]
pub fn git_create_branch(cwd: String, branch: String) -> Result<(), String> {
    let branch = valid_branch(&branch)?;
    run_git(
        &cwd,
        &["checkout".into(), "-b".into(), branch.to_string()],
    )?;
    Ok(())
}

#[tauri::command]
pub fn git_push(cwd: String, set_upstream: Option<bool>) -> Result<String, String> {
    let args = if set_upstream.unwrap_or(false) {
        vec![
            "push".into(),
            "-u".into(),
            "origin".into(),
            "HEAD".into(),
        ]
    } else {
        vec!["push".into()]
    };
    let out = run_git(&cwd, &args)?;
    Ok(if out.trim().is_empty() {
        "Push completed.".into()
    } else {
        out
    })
}

#[tauri::command]
pub fn git_pull(cwd: String) -> Result<String, String> {
    let out = run_git(&cwd, &["pull".into(), "--ff-only".into()])?;
    Ok(if out.trim().is_empty() {
        "Already up to date.".into()
    } else {
        out
    })
}

#[tauri::command]
pub fn git_fetch(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["fetch".into(), "--all".into(), "--prune".into()])?;
    Ok(())
}

#[tauri::command]
pub fn git_discard(cwd: String, path: String, untracked: bool) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("No file selected".into());
    }
    if untracked {
        run_git(&cwd, &["clean".into(), "-f".into(), "--".into(), path])?;
    } else {
        run_git(&cwd, &["restore".into(), "--".into(), path])?;
    }
    Ok(())
}

#[tauri::command]
pub fn git_diff(
    cwd: String,
    path: String,
    staged: bool,
    ignore_space: Option<bool>,
) -> Result<String, String> {
    let mut args = vec!["diff".into()];
    if staged {
        args.push("--cached".into());
    }
    if ignore_space.unwrap_or(false) {
        args.push("--ignore-all-space".into());
    }
    args.push("--".into());
    args.push(path);
    let text = run_git(&cwd, &args)?;
    if text.trim().is_empty() {
        return Ok("No diff.".into());
    }
    Ok(text)
}

#[tauri::command]
pub fn git_show_head(cwd: String, path: String) -> Result<String, String> {
    let rel = path.replace('\\', "/");
    if rel.trim().is_empty() || rel.contains('\0') {
        return Err("invalid path".into());
    }
    run_git(&cwd, &["show".into(), format!("HEAD:{rel}")])
}

#[tauri::command]
pub fn git_clone(url: String, parent: String) -> Result<String, String> {
    let url = url.trim();
    if url.is_empty()
        || url.starts_with('-')
        || url.contains('\n')
        || url.contains('\0')
        || url.contains(' ')
    {
        return Err("invalid repository URL".into());
    }
    let leaf = url
        .trim_end_matches('/')
        .rsplit(['/', ':'])
        .next()
        .unwrap_or("repo");
    let name = leaf.strip_suffix(".git").unwrap_or(leaf);
    if name.is_empty() || name.contains("..") || name.contains('\\') || name.contains('/') {
        return Err("cannot derive a folder name from that URL".into());
    }
    let dest = std::path::Path::new(&parent).join(name);
    if dest.exists() {
        return Err("destination already exists".into());
    }
    run_git(
        &parent,
        &[
            "clone".into(),
            "--".into(),
            url.to_string(),
            dest.display().to_string(),
        ],
    )?;
    Ok(dest.display().to_string())
}

fn normalize_ignore_path(path: &str) -> Result<String, String> {
    let path = path.trim().replace('\\', "/");
    if path.is_empty()
        || path.contains('\n')
        || path.contains('\r')
        || path.contains('\0')
        || path.starts_with('/')
        || path.chars().nth(1) == Some(':')
    {
        return Err("invalid ignore path".into());
    }
    if path.split('/').any(|part| part.is_empty() || part == ".." || part == ".") {
        return Err("invalid ignore path".into());
    }
    Ok(path)
}

#[tauri::command]
pub fn git_ignore(cwd: String, path: String) -> Result<(), String> {
    let line = normalize_ignore_path(&path)?;
    let root = run_git(
        &cwd,
        &["rev-parse".into(), "--show-toplevel".into()],
    )?;
    let ignore_path = std::path::Path::new(root.trim()).join(".gitignore");
    let mut existing = if ignore_path.exists() {
        std::fs::read_to_string(&ignore_path).map_err(|err| err.to_string())?
    } else {
        String::new()
    };
    if existing.lines().any(|current| current.trim() == line) {
        return Ok(());
    }
    if !existing.is_empty() && !existing.ends_with('\n') {
        existing.push('\n');
    }
    existing.push_str(&line);
    existing.push('\n');
    std::fs::write(&ignore_path, existing).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(cwd: String, message: String, amend: Option<bool>) -> Result<(), String> {
    let message = message.trim();
    if message.is_empty() && !amend.unwrap_or(false) {
        return Err("Commit message is empty".into());
    }
    let mut args = vec!["commit".into()];
    if amend.unwrap_or(false) {
        args.push("--amend".into());
        if message.is_empty() {
            args.push("--no-edit".into());
        } else {
            args.push("-m".into());
            args.push(message.to_string());
        }
    } else {
        args.push("-m".into());
        args.push(message.to_string());
    }
    run_git(&cwd, &args)?;
    Ok(())
}

#[tauri::command]
pub fn git_can_amend(cwd: String) -> Result<bool, String> {
    let upstream = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
        .current_dir(&cwd)
        .output();
    let Ok(out) = upstream else {
        return Ok(true);
    };
    if !out.status.success() {
        // No upstream configured — safe to offer amend.
        return Ok(true);
    }
    let status = Command::new("git")
        .args(["status", "-sb", "--porcelain=v1"])
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    if !status.status.success() {
        return Ok(false);
    }
    let text = String::from_utf8_lossy(&status.stdout);
    // First line of -sb looks like "## main...origin/main [ahead 1]" or similar.
    let first = text.lines().next().unwrap_or("");
    if first.contains("[ahead ") && !first.contains("behind") {
        return Ok(true);
    }
    if first.contains("...") && !first.contains("[") {
        // In sync with upstream — amending would rewrite published tip.
        return Ok(false);
    }
    Ok(true)
}

#[tauri::command]
pub fn git_stash_push(cwd: String, message: Option<String>) -> Result<(), String> {
    let mut args = vec!["stash".into(), "push".into(), "-u".into()];
    if let Some(msg) = message {
        let trimmed = msg.trim();
        if !trimmed.is_empty() {
            args.push("-m".into());
            args.push(trimmed.to_string());
        }
    }
    run_git(&cwd, &args)?;
    Ok(())
}

#[tauri::command]
pub fn git_stash_pop(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["stash".into(), "pop".into()])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::normalize_ignore_path;

    #[test]
    fn ignore_path_rules() {
        assert_eq!(normalize_ignore_path("notes.tmp").unwrap(), "notes.tmp");
        assert_eq!(
            normalize_ignore_path("src\\notes.tmp").unwrap(),
            "src/notes.tmp"
        );
        assert!(normalize_ignore_path("").is_err());
        assert!(normalize_ignore_path("a\nb").is_err());
        assert!(normalize_ignore_path("/etc/passwd").is_err());
        assert!(normalize_ignore_path("C:/secret").is_err());
        assert!(normalize_ignore_path("../outside").is_err());
    }

    #[test]
    fn appends_ignore_line_and_hides_the_file() {
        let dir = std::env::temp_dir().join(format!("t3d-ignore-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let init = std::process::Command::new("git")
            .args(["init"])
            .current_dir(&dir)
            .status()
            .expect("git init");
        assert!(init.success());
        std::fs::write(dir.join("notes.tmp"), "x").unwrap();
        let cwd = dir.display().to_string();
        super::git_ignore(cwd.clone(), "notes.tmp".into()).unwrap();
        super::git_ignore(cwd.clone(), "notes.tmp".into()).unwrap();
        let text = std::fs::read_to_string(dir.join(".gitignore")).unwrap();
        assert_eq!(text, "notes.tmp\n");
        let status = super::run_git(&cwd, &["status".into(), "--porcelain".into()]).unwrap();
        assert!(!status.contains("notes.tmp"), "{status}");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
