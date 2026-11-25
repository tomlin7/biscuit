use serde::{Deserialize, Serialize};
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
pub fn git_delete_branch(cwd: String, branch: String, force: Option<bool>) -> Result<(), String> {
    let branch = valid_branch(&branch)?;
    let flag = if force.unwrap_or(false) { "-D" } else { "-d" };
    run_git(&cwd, &["branch".into(), flag.into(), branch.to_string()])?;
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

#[tauri::command]
pub fn git_remote_origin(cwd: String) -> Result<String, String> {
    let out = run_git(&cwd, &["remote".into(), "get-url".into(), "origin".into()])?;
    let trimmed = out.trim();
    if trimmed.is_empty() {
        return Err("origin remote URL is empty".into());
    }
    Ok(trimmed.to_string())
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GitCommitEntry {
    pub hash: String,
    pub author: String,
    pub relative_date: String,
    pub subject: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GitCompareFile {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GitCompareSummary {
    pub base: String,
    pub head: String,
    pub stat: String,
    pub commits: Vec<GitCommitEntry>,
    pub files: Vec<GitCompareFile>,
}

#[tauri::command]
pub fn git_compare_refs(
    cwd: String,
    base: String,
    head: String,
) -> Result<GitCompareSummary, String> {
    let base = valid_branch(&base)?;
    let head = valid_branch(&head)?;
    let range = format!("{base}..{head}");

    let log_out = run_git(
        &cwd,
        &[
            "log".into(),
            "--format=%h%x09%an%x09%ar%x09%s".into(),
            range.clone(),
        ],
    )?;

    let mut commits = Vec::new();
    for line in log_out.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 4 {
            commits.push(GitCommitEntry {
                hash: parts[0].to_string(),
                author: parts[1].to_string(),
                relative_date: parts[2].to_string(),
                subject: parts[3].to_string(),
            });
        }
    }

    let diff_files = run_git(
        &cwd,
        &["diff".into(), "--name-status".into(), range.clone()],
    )?;

    let mut files = Vec::new();
    for line in diff_files.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 2 {
            files.push(GitCompareFile {
                status: parts[0].to_string(),
                path: parts[1..].join(" "),
            });
        }
    }

    let stat = run_git(
        &cwd,
        &["diff".into(), "--shortstat".into(), range],
    )?
    .trim()
    .to_string();

    Ok(GitCompareSummary {
        base: base.to_string(),
        head: head.to_string(),
        stat: if stat.is_empty() {
            "No changes".into()
        } else {
            stat
        },
        commits,
        files,
    })
}

#[tauri::command]
pub fn git_diff_refs(
    cwd: String,
    base: String,
    head: String,
    path: Option<String>,
) -> Result<String, String> {
    let base = valid_branch(&base)?;
    let head = valid_branch(&head)?;
    let range = format!("{base}..{head}");
    let mut args = vec!["diff".into(), range];
    if let Some(p) = path {
        let p = p.trim().replace('\\', "/");
        if !p.is_empty() {
            args.push("--".into());
            args.push(p);
        }
    }
    let out = run_git(&cwd, &args)?;
    Ok(if out.trim().is_empty() {
        "No diff.".into()
    } else {
        out
    })
}

#[tauri::command]
pub fn git_show_ref(cwd: String, r#ref: String, path: String) -> Result<String, String> {
    let r#ref = valid_branch(&r#ref)?;
    let rel = path.trim().replace('\\', "/");
    if rel.is_empty() || rel.contains('\0') {
        return Err("invalid path".into());
    }
    run_git(&cwd, &["show".into(), format!("{ref}:{rel}")])
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitSubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub head_commit: Option<String>,
    pub branch: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RawSubmoduleConfig {
    pub name: String,
    pub path: String,
    pub url: String,
    pub branch: Option<String>,
}

pub fn normalize_submodule_path(p: &str) -> String {
    let replaced = p.trim().replace('\\', "/");
    let trimmed = replaced.trim_start_matches("./").trim_matches('/');
    trimmed.to_string()
}

pub fn parse_gitmodules(content: &str) -> Vec<RawSubmoduleConfig> {
    let mut configs = Vec::new();
    let mut current: Option<RawSubmoduleConfig> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with(';') {
            continue;
        }

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            if let Some(cfg) = current.take() {
                if !cfg.path.is_empty() || !cfg.name.is_empty() {
                    configs.push(cfg);
                }
            }

            let section = trimmed[1..trimmed.len() - 1].trim();
            if section.starts_with("submodule") {
                let name = section
                    .strip_prefix("submodule")
                    .unwrap_or("")
                    .trim()
                    .trim_matches('"')
                    .trim()
                    .to_string();
                current = Some(RawSubmoduleConfig {
                    name,
                    path: String::new(),
                    url: String::new(),
                    branch: None,
                });
            }
        } else if let Some(ref mut cfg) = current {
            if let Some((key, val)) = trimmed.split_once('=') {
                let key = key.trim().to_lowercase();
                let val = val.trim().trim_matches('"').to_string();
                if key == "path" {
                    cfg.path = normalize_submodule_path(&val);
                    if cfg.name.is_empty() {
                        cfg.name = cfg.path.clone();
                    }
                } else if key == "url" {
                    cfg.url = val;
                } else if key == "branch" {
                    cfg.branch = if val.is_empty() { None } else { Some(val) };
                }
            }
        }
    }

    if let Some(cfg) = current {
        if !cfg.path.is_empty() || !cfg.name.is_empty() {
            configs.push(cfg);
        }
    }

    configs
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawSubmoduleStatus {
    pub prefix: char,
    pub commit: String,
    pub path: String,
    pub describe: Option<String>,
}

pub fn parse_submodule_status_line(line: &str) -> Option<RawSubmoduleStatus> {
    if line.trim().is_empty() {
        return None;
    }

    let first_char = line.chars().next()?;
    let prefix = match first_char {
        '-' | '+' | 'U' => first_char,
        _ => ' ',
    };

    let rest = if line.starts_with(['-', '+', 'U']) {
        &line[1..]
    } else {
        line.trim_start()
    };

    let trimmed = rest.trim_start();
    let (commit, after_commit) = match trimmed.split_once(char::is_whitespace) {
        Some((c, rem)) => (c.to_string(), rem.trim_start()),
        None => (trimmed.to_string(), ""),
    };

    if commit.is_empty() {
        return None;
    }

    // Git describe in `git submodule status` is formatted at the end as ` (<describe>)`
    let (raw_path, describe) = if after_commit.ends_with(')') {
        if let Some(open_paren) = after_commit.rfind(" (") {
            let path_part = &after_commit[..open_paren];
            let desc_part = &after_commit[open_paren + 2..after_commit.len() - 1];
            (path_part.trim(), Some(desc_part.trim().to_string()))
        } else {
            (after_commit.trim(), None)
        }
    } else {
        (after_commit.trim(), None)
    };

    let path = normalize_submodule_path(raw_path);
    if path.is_empty() {
        return None;
    }

    Some(RawSubmoduleStatus {
        prefix,
        commit,
        path,
        describe,
    })
}

pub fn submodule_status_label(prefix: char) -> &'static str {
    match prefix {
        '-' => "uninitialized",
        '+' => "modified",
        'U' => "conflict",
        ' ' => "up-to-date",
        _ => "up-to-date",
    }
}

#[tauri::command]
pub fn git_submodules(root: String) -> Result<Vec<GitSubmoduleInfo>, String> {
    let gitmodules_path = std::path::Path::new(&root).join(".gitmodules");
    let mut configs = Vec::new();

    if gitmodules_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&gitmodules_path) {
            configs = parse_gitmodules(&content);
        }
    }

    // Also run `git submodule status`
    let status_output = run_git(&root, &["submodule".into(), "status".into()]).unwrap_or_default();
    let statuses: Vec<RawSubmoduleStatus> = status_output
        .lines()
        .filter_map(parse_submodule_status_line)
        .collect();

    let mut result = Vec::new();
    let mut matched_statuses = std::collections::HashSet::new();

    for cfg in configs {
        let status_match = statuses.iter().enumerate().find(|(idx, s)| {
            !matched_statuses.contains(idx) && (s.path == cfg.path || s.path == cfg.name)
        });

        if let Some((idx, s)) = status_match {
            matched_statuses.insert(idx);
            let branch = cfg.branch.clone().or_else(|| {
                s.describe
                    .as_deref()
                    .map(|d| d.strip_prefix("heads/").unwrap_or(d).to_string())
            });
            result.push(GitSubmoduleInfo {
                name: if cfg.name.is_empty() { cfg.path.clone() } else { cfg.name },
                path: cfg.path,
                url: cfg.url,
                head_commit: if s.commit.is_empty() { None } else { Some(s.commit.clone()) },
                branch,
                status: submodule_status_label(s.prefix).to_string(),
            });
        } else {
            result.push(GitSubmoduleInfo {
                name: if cfg.name.is_empty() { cfg.path.clone() } else { cfg.name },
                path: cfg.path,
                url: cfg.url,
                head_commit: None,
                branch: cfg.branch,
                status: "uninitialized".to_string(),
            });
        }
    }

    // Add any submodules reported by `git submodule status` that were not in `.gitmodules`
    for (idx, s) in statuses.into_iter().enumerate() {
        if !matched_statuses.contains(&idx) {
            let name = s.path.split('/').last().unwrap_or(&s.path).to_string();
            let branch = s
                .describe
                .as_deref()
                .map(|d| d.strip_prefix("heads/").unwrap_or(d).to_string());
            let url = run_git(&root, &["config".into(), format!("submodule.{}.url", name)])
                .unwrap_or_default()
                .trim()
                .to_string();
            result.push(GitSubmoduleInfo {
                name,
                path: s.path,
                url,
                head_commit: if s.commit.is_empty() { None } else { Some(s.commit) },
                branch,
                status: submodule_status_label(s.prefix).to_string(),
            });
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn git_submodule_init(root: String, path: Option<String>) -> Result<String, String> {
    let mut args = vec!["submodule".into(), "init".into()];
    if let Some(p) = path {
        let p = normalize_submodule_path(&p);
        if !p.is_empty() {
            args.push("--".into());
            args.push(p);
        }
    }
    let out = run_git(&root, &args)?;
    Ok(if out.trim().is_empty() {
        "Submodule initialized.".into()
    } else {
        out
    })
}

#[tauri::command]
pub fn git_submodule_update(
    root: String,
    path: Option<String>,
    recursive: bool,
) -> Result<String, String> {
    let mut args = vec!["submodule".into(), "update".into(), "--init".into()];
    if recursive {
        args.push("--recursive".into());
    }
    if let Some(p) = path {
        let p = normalize_submodule_path(&p);
        if !p.is_empty() {
            args.push("--".into());
            args.push(p);
        }
    }
    let out = run_git(&root, &args)?;
    Ok(if out.trim().is_empty() {
        "Submodules up to date.".into()
    } else {
        out
    })
}

#[tauri::command]
pub fn git_submodule_sync(root: String, recursive: bool) -> Result<String, String> {
    let mut args = vec!["submodule".into(), "sync".into()];
    if recursive {
        args.push("--recursive".into());
    }
    let out = run_git(&root, &args)?;
    Ok(if out.trim().is_empty() {
        "Submodules synchronized.".into()
    } else {
        out
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitTagInfo {
    pub name: String,
    pub commit: String,
    pub message: Option<String>,
    pub annotated: bool,
    pub date: Option<String>,
}

pub fn valid_tag_name(name: &str) -> Result<&str, String> {
    let name = name.trim();
    if name.is_empty()
        || name == "@"
        || name.starts_with('-')
        || name.starts_with('/')
        || name.ends_with('/')
        || name.ends_with('.')
        || name.contains("//")
        || name.contains("..")
        || name.contains("@{")
        || name.chars().any(|c| {
            c.is_control()
                || c.is_whitespace()
                || matches!(c, '~' | '^' | ':' | '?' | '*' | '[' | '\\')
        })
    {
        return Err("invalid tag name".into());
    }
    for part in name.split('/') {
        if part.is_empty() || part.starts_with('.') || part.ends_with(".lock") {
            return Err("invalid tag name".into());
        }
    }
    Ok(name)
}

pub fn parse_git_tags_output(output: &str) -> Vec<GitTagInfo> {
    let mut tags = Vec::new();
    for line in output.lines() {
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split('\0').collect();
        if parts.is_empty() {
            continue;
        }
        let name = parts[0].trim();
        if name.is_empty() {
            continue;
        }
        let objecttype = parts.get(1).map(|s| s.trim()).unwrap_or("");
        let peeled = parts.get(2).map(|s| s.trim()).unwrap_or("");
        let obj = parts.get(3).map(|s| s.trim()).unwrap_or("");
        let date_raw = parts.get(4).map(|s| s.trim()).unwrap_or("");
        let subject_raw = parts.get(5).map(|s| s.trim()).unwrap_or("");

        let annotated = objecttype == "tag";
        let commit = if !peeled.is_empty() {
            peeled.to_string()
        } else {
            obj.to_string()
        };
        let date = if !date_raw.is_empty() {
            Some(date_raw.to_string())
        } else {
            None
        };
        let message = if annotated && !subject_raw.is_empty() {
            Some(subject_raw.to_string())
        } else {
            None
        };

        tags.push(GitTagInfo {
            name: name.to_string(),
            commit,
            message,
            annotated,
            date,
        });
    }
    tags
}

#[tauri::command]
pub fn git_tags(root: String) -> Result<Vec<GitTagInfo>, String> {
    let format_arg = "--format=%(refname:strip=2)%00%(objecttype)%00%(*objectname:short)%00%(objectname:short)%00%(creatordate:short)%00%(contents:subject)".to_string();
    let output = run_git(
        &root,
        &[
            "tag".into(),
            "-l".into(),
            "--sort=-creatordate".into(),
            format_arg,
        ],
    )?;
    Ok(parse_git_tags_output(&output))
}

#[tauri::command]
pub fn git_create_tag(
    root: String,
    name: String,
    target: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let tag_name = valid_tag_name(&name)?;
    let mut args = vec!["tag".to_string()];
    let has_message = message
        .as_ref()
        .map(|m| !m.trim().is_empty())
        .unwrap_or(false);

    if has_message {
        args.push("-a".into());
        args.push(tag_name.into());
        args.push("-m".into());
        args.push(message.unwrap().trim().to_string());
    } else {
        args.push(tag_name.into());
    }

    if let Some(t) = target {
        let t_trimmed = t.trim();
        if !t_trimmed.is_empty() {
            if t_trimmed.starts_with('-')
                || t_trimmed.contains(char::is_whitespace)
                || t_trimmed.contains('\0')
            {
                return Err("invalid target commit or ref".into());
            }
            args.push(t_trimmed.to_string());
        }
    }

    run_git(&root, &args)?;
    Ok(())
}

#[tauri::command]
pub fn git_delete_tag(root: String, name: String) -> Result<(), String> {
    let tag_name = valid_tag_name(&name)?;
    run_git(&root, &["tag".into(), "-d".into(), tag_name.to_string()])?;
    Ok(())
}

#[tauri::command]
pub fn git_push_tags(root: String, remote: Option<String>) -> Result<(), String> {
    let remote = remote.as_deref().unwrap_or("origin").trim();
    let remote = if remote.is_empty() { "origin" } else { remote };
    if remote.starts_with('-') || remote.contains(char::is_whitespace) || remote.contains('\0') {
        return Err("invalid remote name".into());
    }
    run_git(&root, &["push".into(), remote.into(), "--tags".into()])?;
    Ok(())
}

#[tauri::command]
pub fn git_delete_remote_tag(
    root: String,
    name: String,
    remote: Option<String>,
) -> Result<(), String> {
    let tag_name = valid_tag_name(&name)?;
    let remote = remote.as_deref().unwrap_or("origin").trim();
    let remote = if remote.is_empty() { "origin" } else { remote };
    if remote.starts_with('-') || remote.contains(char::is_whitespace) || remote.contains('\0') {
        return Err("invalid remote name".into());
    }
    let refspec = format!("refs/tags/{tag_name}");
    run_git(
        &root,
        &[
            "push".into(),
            remote.into(),
            "--delete".into(),
            refspec,
        ],
    )?;
    Ok(())
}

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

    #[test]
    fn compare_refs_between_branches() {
        let dir = std::env::temp_dir().join(format!("t3d-cmp-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let run = |args: &[&str]| {
            let res = std::process::Command::new("git")
                .args(args)
                .current_dir(&dir)
                .status()
                .expect("git");
            assert!(res.success());
        };
        run(&["init"]);
        run(&["config", "user.name", "Tomlin7"]);
        run(&["config", "user.email", "billydevbusiness@gmail.com"]);
        run(&["config", "commit.gpgsign", "false"]);
        std::fs::write(dir.join("a.txt"), "hello\n").unwrap();
        run(&["add", "a.txt"]);
        run(&["commit", "--no-gpg-sign", "-m", "init commit"]);
        run(&["branch", "-M", "main"]);

        run(&["checkout", "-b", "feature"]);
        std::fs::create_dir_all(dir.join("sub")).unwrap();
        std::fs::write(dir.join("sub").join("b.txt"), "world\n").unwrap();
        run(&["add", "sub/b.txt"]);
        run(&["commit", "--no-gpg-sign", "-m", "feature commit"]);

        let cwd = dir.display().to_string();
        let res = super::git_compare_refs(cwd.clone(), "main".into(), "feature".into()).unwrap();
        assert_eq!(res.base, "main");
        assert_eq!(res.head, "feature");
        assert_eq!(res.commits.len(), 1);
        assert_eq!(res.commits[0].subject, "feature commit");
        assert_eq!(res.files.len(), 1);
        assert_eq!(res.files[0].path, "sub/b.txt");

        // Diff with forward slash
        let diff = super::git_diff_refs(cwd.clone(), "main".into(), "feature".into(), Some("sub/b.txt".into())).unwrap();
        assert!(diff.contains("+world"));

        // Diff with Windows backslash path
        let diff_win = super::git_diff_refs(cwd.clone(), "main".into(), "feature".into(), Some("sub\\b.txt".into())).unwrap();
        assert!(diff_win.contains("+world"));

        // git_show_ref
        let head_content = super::git_show_ref(cwd.clone(), "feature".into(), "sub/b.txt".into()).unwrap();
        assert_eq!(head_content, "world\n");
        let base_content = super::git_show_ref(cwd.clone(), "main".into(), "sub/b.txt".into());
        assert!(base_content.is_err());

        // invalid ref returns error
        let bad_compare = super::git_compare_refs(cwd.clone(), "main".into(), "nonexistent".into());
        assert!(bad_compare.is_err());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn parse_gitmodules_content() {
        let sample = r#"
# Sample gitmodules
[submodule "libs/engine"]
	path = ./libs/engine/
	url = https://github.com/example/engine.git
	branch = develop

; Another submodule with custom name
[submodule "custom-tools"]
	path = tools/helpers
	url = https://github.com/example/helpers.git
"#;
        let configs = super::parse_gitmodules(sample);
        assert_eq!(configs.len(), 2);
        assert_eq!(configs[0].name, "libs/engine");
        assert_eq!(configs[0].path, "libs/engine");
        assert_eq!(configs[0].url, "https://github.com/example/engine.git");
        assert_eq!(configs[0].branch, Some("develop".into()));

        assert_eq!(configs[1].name, "custom-tools");
        assert_eq!(configs[1].path, "tools/helpers");
        assert_eq!(configs[1].url, "https://github.com/example/helpers.git");
        assert_eq!(configs[1].branch, None);
    }

    #[test]
    fn parse_submodule_status() {
        let line_clean = " 4b825dc642cb6eb9a060e54bf8d69288fbee4904 libs/engine (v1.0-alpha)";
        let s1 = super::parse_submodule_status_line(line_clean).unwrap();
        assert_eq!(s1.prefix, ' ');
        assert_eq!(s1.commit, "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
        assert_eq!(s1.path, "libs/engine");
        assert_eq!(s1.describe, Some("v1.0-alpha".into()));
        assert_eq!(super::submodule_status_label(s1.prefix), "up-to-date");

        let line_uninit = "-d01b8dd82798e3b3e23dd25619574d39e3ecbb7d tools/helpers";
        let s2 = super::parse_submodule_status_line(line_uninit).unwrap();
        assert_eq!(s2.prefix, '-');
        assert_eq!(s2.commit, "d01b8dd82798e3b3e23dd25619574d39e3ecbb7d");
        assert_eq!(s2.path, "tools/helpers");
        assert_eq!(s2.describe, None);
        assert_eq!(super::submodule_status_label(s2.prefix), "uninitialized");

        let line_mod = "+3c2f6d482798e3b3e23dd25619574d39e3ecbb7d tools/helpers (heads/patch-1)";
        let s3 = super::parse_submodule_status_line(line_mod).unwrap();
        assert_eq!(s3.prefix, '+');
        assert_eq!(super::submodule_status_label(s3.prefix), "modified");

        let line_conflict = "U4b825dc642cb6eb9a060e54bf8d69288fbee4904 tools/helpers";
        let s4 = super::parse_submodule_status_line(line_conflict).unwrap();
        assert_eq!(s4.prefix, 'U');
        assert_eq!(super::submodule_status_label(s4.prefix), "conflict");

        // Paths with spaces and descriptions
        let line_space = "+4b825dc642cb6eb9a060e54bf8d69288fbee4904 tools/custom helpers (v2.0 preview)";
        let s5 = super::parse_submodule_status_line(line_space).unwrap();
        assert_eq!(s5.prefix, '+');
        assert_eq!(s5.path, "tools/custom helpers");
        assert_eq!(s5.describe, Some("v2.0 preview".into()));

        // Paths with spaces without descriptions
        let line_space_uninit = "-d01b8dd82798e3b3e23dd25619574d39e3ecbb7d tools/custom helpers";
        let s6 = super::parse_submodule_status_line(line_space_uninit).unwrap();
        assert_eq!(s6.prefix, '-');
        assert_eq!(s6.path, "tools/custom helpers");
        assert_eq!(s6.describe, None);
    }

    #[test]
    fn submodule_operations_integration() {
        let base_dir = std::env::temp_dir().join(format!("t3d-submod-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base_dir);
        let sub_repo = base_dir.join("child-repo");
        let parent_repo = base_dir.join("parent-repo");
        std::fs::create_dir_all(&sub_repo).unwrap();
        std::fs::create_dir_all(&parent_repo).unwrap();

        let run_in = |dir: &std::path::Path, args: &[&str]| {
            let res = std::process::Command::new("git")
                .args(args)
                .current_dir(dir)
                .status()
                .expect("git execution");
            assert!(res.success());
        };

        // Init child repo
        run_in(&sub_repo, &["init"]);
        run_in(&sub_repo, &["config", "user.name", "Tomlin7"]);
        run_in(&sub_repo, &["config", "user.email", "billydevbusiness@gmail.com"]);
        run_in(&sub_repo, &["config", "commit.gpgsign", "false"]);
        std::fs::write(sub_repo.join("lib.txt"), "submodule library code\n").unwrap();
        run_in(&sub_repo, &["add", "lib.txt"]);
        run_in(&sub_repo, &["commit", "--no-gpg-sign", "-m", "child initial commit"]);
        run_in(&sub_repo, &["branch", "-M", "main"]);

        // Init parent repo
        run_in(&parent_repo, &["init"]);
        run_in(&parent_repo, &["config", "user.name", "Tomlin7"]);
        run_in(&parent_repo, &["config", "user.email", "billydevbusiness@gmail.com"]);
        run_in(&parent_repo, &["config", "commit.gpgsign", "false"]);
        run_in(&parent_repo, &["config", "protocol.file.allow", "always"]);
        std::fs::write(parent_repo.join("main.txt"), "main project\n").unwrap();
        run_in(&parent_repo, &["add", "main.txt"]);
        run_in(&parent_repo, &["commit", "--no-gpg-sign", "-m", "parent initial commit"]);
        run_in(&parent_repo, &["branch", "-M", "main"]);

        let sub_url = sub_repo.to_str().unwrap().replace('\\', "/");
        // Add submodule with file protocol allowed
        let add_res = std::process::Command::new("git")
            .args(["-c", "protocol.file.allow=always", "submodule", "add", &sub_url, "modules/child"])
            .current_dir(&parent_repo)
            .status()
            .expect("git submodule add");
        assert!(add_res.success());
        run_in(&parent_repo, &["commit", "--no-gpg-sign", "-m", "add child submodule"]);

        let parent_str = parent_repo.display().to_string();
        // Query submodules
        let subs = super::git_submodules(parent_str.clone()).expect("git_submodules");
        assert_eq!(subs.len(), 1);
        assert_eq!(subs[0].path, "modules/child");
        assert!(subs[0].url.contains("child-repo"));
        assert!(subs[0].head_commit.is_some());

        // Test sync
        let sync_res = super::git_submodule_sync(parent_str.clone(), true).expect("git_submodule_sync");
        assert!(!sync_res.is_empty());

        // Test deinit to uninitialized state
        run_in(&parent_repo, &["submodule", "deinit", "-f", "modules/child"]);
        let subs_deinit = super::git_submodules(parent_str.clone()).expect("git_submodules deinit");
        assert_eq!(subs_deinit[0].status, "uninitialized");

        // Test git_submodule_init
        let init_res = super::git_submodule_init(parent_str.clone(), Some("modules/child".into())).expect("git_submodule_init");
        assert!(!init_res.is_empty());

        // Test update
        let update_res = super::git_submodule_update(parent_str.clone(), Some("modules/child".into()), false).expect("git_submodule_update");
        assert!(!update_res.is_empty());

        let subs_after = super::git_submodules(parent_str.clone()).expect("git_submodules after update");
        assert_eq!(subs_after[0].status, "up-to-date");

        let _ = std::fs::remove_dir_all(&base_dir);
    }

    #[test]
    fn parse_git_tags_format() {
        let sample = "v2.0.0\0tag\03e28592\0ffc39d0\02026-11-10\0annotated release 2\nv1.0.0\0commit\0\03e28592\02026-11-09\0initial commit\n";
        let tags = super::parse_git_tags_output(sample);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].name, "v2.0.0");
        assert_eq!(tags[0].commit, "3e28592");
        assert_eq!(tags[0].annotated, true);
        assert_eq!(tags[0].message, Some("annotated release 2".into()));
        assert_eq!(tags[0].date, Some("2026-11-10".into()));

        assert_eq!(tags[1].name, "v1.0.0");
        assert_eq!(tags[1].commit, "3e28592");
        assert_eq!(tags[1].annotated, false);
        assert_eq!(tags[1].message, None);
        assert_eq!(tags[1].date, Some("2026-11-09".into()));
    }

    #[test]
    fn valid_tag_names() {
        assert!(super::valid_tag_name("v1.0.0").is_ok());
        assert!(super::valid_tag_name("release-2026.11").is_ok());
        assert!(super::valid_tag_name("feature/tags").is_ok());
        assert!(super::valid_tag_name("").is_err());
        assert!(super::valid_tag_name("@").is_err());
        assert!(super::valid_tag_name("-bad").is_err());
        assert!(super::valid_tag_name("has space").is_err());
        assert!(super::valid_tag_name("bad~char").is_err());
        assert!(super::valid_tag_name("bad^char").is_err());
        assert!(super::valid_tag_name("bad:char").is_err());
        assert!(super::valid_tag_name("bad..name").is_err());
        assert!(super::valid_tag_name("bad.lock").is_err());
        assert!(super::valid_tag_name("/v1.0.0").is_err());
        assert!(super::valid_tag_name("v1.0.0/").is_err());
        assert!(super::valid_tag_name("v1//v2").is_err());
        assert!(super::valid_tag_name("foo/.bar").is_err());
        assert!(super::valid_tag_name("foo/bar.lock").is_err());
        assert!(super::valid_tag_name("tag\x07bell").is_err());
    }

    #[test]
    fn tag_operations_integration() {
        let base_dir = std::env::temp_dir().join(format!("t3d-tags-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base_dir);
        std::fs::create_dir_all(&base_dir).unwrap();

        let run_in = |dir: &std::path::Path, args: &[&str]| {
            let res = std::process::Command::new("git")
                .args(args)
                .current_dir(dir)
                .status()
                .expect("git execution");
            assert!(res.success());
        };

        run_in(&base_dir, &["init"]);
        run_in(&base_dir, &["config", "user.name", "Tomlin7"]);
        run_in(&base_dir, &["config", "user.email", "billydevbusiness@gmail.com"]);
        run_in(&base_dir, &["config", "commit.gpgsign", "false"]);
        std::fs::write(base_dir.join("file.txt"), "hello world\n").unwrap();
        run_in(&base_dir, &["add", "file.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "first commit"]);
        run_in(&base_dir, &["branch", "-M", "main"]);

        let root_str = base_dir.display().to_string();

        // Initially no tags
        let tags = super::git_tags(root_str.clone()).expect("git_tags empty");
        assert_eq!(tags.len(), 0);

        // Create lightweight tag
        super::git_create_tag(root_str.clone(), "v0.1.0".into(), None, None).expect("create lightweight tag");

        // Create annotated tag
        super::git_create_tag(
            root_str.clone(),
            "v0.2.0".into(),
            Some("HEAD".into()),
            Some("version 0.2.0 annotation".into()),
        ).expect("create annotated tag");

        let tags = super::git_tags(root_str.clone()).expect("git_tags with 2 tags");
        assert_eq!(tags.len(), 2);
        let t_annotated = tags.iter().find(|t| t.name == "v0.2.0").expect("find v0.2.0");
        assert!(t_annotated.annotated);
        assert_eq!(t_annotated.message, Some("version 0.2.0 annotation".into()));
        assert!(!t_annotated.commit.is_empty());
        assert!(t_annotated.date.is_some());

        let t_lightweight = tags.iter().find(|t| t.name == "v0.1.0").expect("find v0.1.0");
        assert!(!t_lightweight.annotated);
        assert_eq!(t_lightweight.message, None);
        assert!(!t_lightweight.commit.is_empty());
        assert!(t_lightweight.date.is_some());

        // Delete tag
        super::git_delete_tag(root_str.clone(), "v0.1.0".into()).expect("delete tag");
        let tags_after_delete = super::git_tags(root_str.clone()).expect("git_tags after delete");
        assert_eq!(tags_after_delete.len(), 1);
        assert_eq!(tags_after_delete[0].name, "v0.2.0");

        // Set up bare remote repository to test git_push_tags and git_delete_remote_tag
        let remote_dir = std::env::temp_dir().join(format!("t3d-tags-remote-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&remote_dir);
        std::fs::create_dir_all(&remote_dir).unwrap();
        run_in(&remote_dir, &["init", "--bare"]);
        let remote_str = remote_dir.display().to_string();

        run_in(&base_dir, &["remote", "add", "origin", &remote_str]);

        // Push tags to remote
        super::git_push_tags(root_str.clone(), Some("origin".into())).expect("git_push_tags");

        // Verify remote received the tag
        let ls_out = std::process::Command::new("git")
            .args(["ls-remote", "--tags", "origin"])
            .current_dir(&base_dir)
            .output()
            .expect("ls-remote");
        assert!(String::from_utf8_lossy(&ls_out.stdout).contains("refs/tags/v0.2.0"));

        // Delete remote tag
        super::git_delete_remote_tag(root_str.clone(), "v0.2.0".into(), Some("origin".into()))
            .expect("delete remote tag");

        let ls_after = std::process::Command::new("git")
            .args(["ls-remote", "--tags", "origin"])
            .current_dir(&base_dir)
            .output()
            .expect("ls-remote after delete");
        assert!(!String::from_utf8_lossy(&ls_after.stdout).contains("refs/tags/v0.2.0"));

        let _ = std::fs::remove_dir_all(&remote_dir);
        let _ = std::fs::remove_dir_all(&base_dir);
    }
}

