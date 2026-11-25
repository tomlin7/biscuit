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

    Ok(GitSummary { branch, entries })
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
pub fn git_push(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["push".into()])?;
    Ok(())
}

#[tauri::command]
pub fn git_pull(cwd: String) -> Result<(), String> {
    run_git(&cwd, &["pull".into()])?;
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
pub fn git_diff(cwd: String, path: String, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff".into()];
    if staged {
        args.push("--cached".into());
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
pub fn git_commit(cwd: String, message: String) -> Result<(), String> {
    let message = message.trim();
    if message.is_empty() {
        return Err("Commit message is empty".into());
    }
    run_git(&cwd, &["commit".into(), "-m".into(), message.to_string()])?;
    Ok(())
}
