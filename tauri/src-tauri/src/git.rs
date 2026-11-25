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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitCommitInfo {
    pub sha: String,
    pub short_sha: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitRebaseStatus {
    pub in_progress: bool,
    pub current_step: Option<usize>,
    pub total_steps: Option<usize>,
    pub head_name: Option<String>,
    pub onto: Option<String>,
    pub current_commit: Option<String>,
    pub has_conflicts: bool,
    pub conflicts: Vec<String>,
    pub rebase_type: Option<String>,
    pub cherry_pick_in_progress: bool,
    pub cherry_pick_head: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RebaseTodoItem {
    pub action: String,
    pub sha: String,
    pub short_sha: String,
    pub message: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitRebaseResult {
    pub success: bool,
    pub status: String,
    pub message: String,
    pub current_commit: Option<String>,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitCherryPickResult {
    pub success: bool,
    pub status: String,
    pub message: String,
    pub conflicts: Vec<String>,
}

pub struct GitExecOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    #[allow(dead_code)]
    pub exit_code: Option<i32>,
}

fn exec_git(cwd: &str, args: &[String], envs: &[(&str, &str)]) -> Result<GitExecOutput, String> {
    let mut cmd = Command::new("git");
    cmd.args(args).current_dir(cwd);
    for (k, v) in envs {
        cmd.env(k, v);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    Ok(GitExecOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

fn resolve_git_dir(cwd: &str) -> Result<std::path::PathBuf, String> {
    let out = run_git(cwd, &["rev-parse".into(), "--git-dir".into()])?;
    let path = std::path::Path::new(out.trim());
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Ok(std::path::Path::new(cwd).join(path))
    }
}

pub fn get_conflicted_files(cwd: &str) -> Vec<String> {
    let porcelain = match run_git(cwd, &["status".into(), "--porcelain=v1".into(), "-u".into()]) {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };
    let mut conflicts = Vec::new();
    for line in porcelain.lines() {
        if line.len() < 4 {
            continue;
        }
        let index = line.chars().next().unwrap_or(' ');
        let worktree = line.chars().nth(1).unwrap_or(' ');
        let is_conflict = match (index, worktree) {
            ('U', _) | (_, 'U') | ('A', 'A') | ('D', 'D') => true,
            _ => false,
        };
        if is_conflict {
            let path_part = line[3..].trim();
            let path = if let Some((_, rhs)) = path_part.split_once(" -> ") {
                rhs.to_string()
            } else {
                path_part.to_string()
            };
            conflicts.push(path);
        }
    }
    conflicts
}

struct RebaseScriptContext {
    rebase_dir: std::path::PathBuf,
    seq_editor_path: std::path::PathBuf,
    msg_editor_path: std::path::PathBuf,
}

impl RebaseScriptContext {
    fn new(git_dir: &std::path::Path) -> Result<Self, String> {
        let rebase_dir = git_dir.join("t3d-rebase");
        if rebase_dir.exists() {
            let _ = std::fs::remove_dir_all(&rebase_dir);
        }
        std::fs::create_dir_all(&rebase_dir)
            .map_err(|e| format!("Failed to create directory for rebase: {e}"))?;

        let seq_editor_path = rebase_dir.join("seq_editor.sh");
        let msg_editor_path = rebase_dir.join("msg_editor.sh");

        Ok(Self {
            rebase_dir,
            seq_editor_path,
            msg_editor_path,
        })
    }

    fn write_scripts(
        &self,
        todo_file: &std::path::Path,
        messages_dir: &std::path::Path,
    ) -> Result<(), String> {
        let todo_str = todo_file.to_string_lossy().replace('\\', "/");
        let msgs_str = messages_dir.to_string_lossy().replace('\\', "/");

        let seq_content = format!(
            "#!/bin/sh\ncp \"{}\" \"$1\"\n",
            todo_str
        );
        std::fs::write(&self.seq_editor_path, seq_content)
            .map_err(|e| format!("failed to write seq_editor: {e}"))?;

        let msg_content = format!(
            "#!/bin/sh\n\
             DIR=$(dirname \"$1\")\n\
             LAST_SHA=\"\"\n\
             if [ -f \"$DIR/rebase-merge/done\" ]; then\n\
               LAST_SHA=$(awk 'END {{print $2}}' \"$DIR/rebase-merge/done\")\n\
             elif [ -f \"$DIR/rebase-apply/original-commit\" ]; then\n\
               LAST_SHA=$(cat \"$DIR/rebase-apply/original-commit\")\n\
             fi\n\
             if [ -n \"$LAST_SHA\" ] && [ -f \"{}/$LAST_SHA.txt\" ]; then\n\
               cp \"{}/$LAST_SHA.txt\" \"$1\"\n\
             fi\n",
            msgs_str, msgs_str
        );
        std::fs::write(&self.msg_editor_path, msg_content)
            .map_err(|e| format!("failed to write msg_editor: {e}"))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o755);
            let _ = std::fs::set_permissions(&self.seq_editor_path, perms.clone());
            let _ = std::fs::set_permissions(&self.msg_editor_path, perms);
        }

        Ok(())
    }

    fn seq_editor_cmd(&self) -> String {
        let p = self.seq_editor_path.to_string_lossy().replace('\\', "/");
        format!("sh \"{}\"", p)
    }

    fn msg_editor_cmd(&self) -> String {
        let p = self.msg_editor_path.to_string_lossy().replace('\\', "/");
        format!("sh \"{}\"", p)
    }
}

fn get_msg_editor_cmd(git_dir: &std::path::Path) -> String {
    let msg_editor_path = git_dir.join("t3d-rebase").join("msg_editor.sh");
    if msg_editor_path.exists() {
        let p = msg_editor_path.to_string_lossy().replace('\\', "/");
        format!("sh \"{}\"", p)
    } else {
        "true".to_string()
    }
}

fn cleanup_rebase_metadata(git_dir: &std::path::Path) {
    let rebase_dir = git_dir.join("t3d-rebase");
    if rebase_dir.exists() {
        let _ = std::fs::remove_dir_all(&rebase_dir);
    }
}

#[tauri::command]
pub fn git_log(
    root: String,
    max_count: Option<usize>,
    branch: Option<String>,
) -> Result<Vec<GitCommitInfo>, String> {
    let mut args = vec![
        "log".to_string(),
        "--date=short".to_string(),
        "--format=%H%x1f%h%x1f%an%x1f%ad%x1f%s".to_string(),
    ];
    let limit = max_count.unwrap_or(50);
    if limit > 0 {
        args.push(format!("-n{limit}"));
    }
    if let Some(ref b) = branch {
        let trimmed = b.trim();
        if !trimmed.is_empty() {
            if trimmed.starts_with('-') {
                return Err("Branch name cannot start with '-'".to_string());
            }
            args.push(trimmed.to_string());
        }
    }
    let res = exec_git(&root, &args, &[])?;
    if !res.success {
        if res.stderr.contains("does not have any commits yet")
            || res.stderr.contains("fatal: your current branch")
            || res.stderr.contains("fatal: ambiguous argument 'HEAD'")
        {
            return Ok(Vec::new());
        }
        return Err(if res.stderr.trim().is_empty() {
            "git log failed".into()
        } else {
            res.stderr.trim().to_string()
        });
    }

    let mut commits = Vec::new();
    for line in res.stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split('\x1f').collect();
        if parts.len() >= 5 {
            commits.push(GitCommitInfo {
                sha: parts[0].to_string(),
                short_sha: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
                message: parts[4].to_string(),
            });
        }
    }
    Ok(commits)
}

#[tauri::command]
pub fn git_rebase_status(root: String) -> Result<GitRebaseStatus, String> {
    let git_dir = resolve_git_dir(&root)?;
    let conflicts = get_conflicted_files(&root);
    let has_conflicts = !conflicts.is_empty();

    let rebase_merge_dir = git_dir.join("rebase-merge");
    let rebase_apply_dir = git_dir.join("rebase-apply");
    let cp_head_file = git_dir.join("CHERRY_PICK_HEAD");

    let cherry_pick_in_progress = cp_head_file.exists();
    let cherry_pick_head = if cherry_pick_in_progress {
        std::fs::read_to_string(&cp_head_file).ok().map(|s| s.trim().to_string())
    } else {
        None
    };

    if rebase_merge_dir.exists() {
        let current_step = std::fs::read_to_string(rebase_merge_dir.join("msgnum"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok());
        let total_steps = std::fs::read_to_string(rebase_merge_dir.join("end"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok());
        let head_name = std::fs::read_to_string(rebase_merge_dir.join("head-name"))
            .ok()
            .map(|s| s.trim().trim_start_matches("refs/heads/").to_string());
        let onto = std::fs::read_to_string(rebase_merge_dir.join("onto"))
            .ok()
            .map(|s| s.trim().to_string());
        let current_commit = std::fs::read_to_string(rebase_merge_dir.join("stopped-sha"))
            .ok()
            .map(|s| s.trim().to_string())
            .or_else(|| {
                std::fs::read_to_string(rebase_merge_dir.join("current-commit"))
                    .ok()
                    .map(|s| s.trim().to_string())
            })
            .or_else(|| {
                std::fs::read_to_string(rebase_merge_dir.join("done"))
                    .ok()
                    .and_then(|s| {
                        s.lines()
                            .last()
                            .and_then(|l| l.split_whitespace().nth(1))
                            .map(|sha| sha.to_string())
                    })
            });

        return Ok(GitRebaseStatus {
            in_progress: true,
            current_step,
            total_steps,
            head_name,
            onto,
            current_commit,
            has_conflicts,
            conflicts,
            rebase_type: Some("merge".to_string()),
            cherry_pick_in_progress,
            cherry_pick_head,
        });
    }

    if rebase_apply_dir.exists() {
        let current_step = std::fs::read_to_string(rebase_apply_dir.join("next"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok());
        let total_steps = std::fs::read_to_string(rebase_apply_dir.join("last"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok());
        let head_name = std::fs::read_to_string(rebase_apply_dir.join("head-name"))
            .ok()
            .map(|s| s.trim().trim_start_matches("refs/heads/").to_string());
        let onto = std::fs::read_to_string(rebase_apply_dir.join("onto"))
            .ok()
            .map(|s| s.trim().to_string());
        let current_commit = std::fs::read_to_string(rebase_apply_dir.join("original-commit"))
            .ok()
            .map(|s| s.trim().to_string())
            .or_else(|| {
                std::fs::read_to_string(rebase_apply_dir.join("current-commit"))
                    .ok()
                    .map(|s| s.trim().to_string())
            });

        return Ok(GitRebaseStatus {
            in_progress: true,
            current_step,
            total_steps,
            head_name,
            onto,
            current_commit,
            has_conflicts,
            conflicts,
            rebase_type: Some("apply".to_string()),
            cherry_pick_in_progress,
            cherry_pick_head,
        });
    }

    // Clean up any stale rebase metadata if rebase is not active
    cleanup_rebase_metadata(&git_dir);

    Ok(GitRebaseStatus {
        in_progress: false,
        current_step: None,
        total_steps: None,
        head_name: None,
        onto: None,
        current_commit: None,
        has_conflicts,
        conflicts,
        rebase_type: None,
        cherry_pick_in_progress,
        cherry_pick_head,
    })
}

#[tauri::command]
pub fn git_rebase_todo(root: String, upstream: String) -> Result<Vec<RebaseTodoItem>, String> {
    let trimmed = upstream.trim();
    let is_root = trimmed == "--root" || trimmed.eq_ignore_ascii_case("root");
    let mut args = vec![
        "log".into(),
        "--reverse".into(),
        "--no-merges".into(),
        "--date=short".into(),
        "--format=%H%x1f%h%x1f%an%x1f%ad%x1f%s".into(),
    ];

    if is_root {
        args.push("HEAD".into());
    } else {
        let target = if trimmed.is_empty() {
            "HEAD~1".to_string()
        } else {
            if trimmed.starts_with('-') {
                return Err("Invalid upstream: cannot start with '-' (except '--root')".to_string());
            }
            trimmed.to_string()
        };
        args.push(format!("{target}..HEAD"));
    }

    let output = run_git(&root, &args)?;

    let mut items = Vec::new();
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.split('\x1f').collect();
        if parts.len() >= 5 {
            items.push(RebaseTodoItem {
                action: "pick".to_string(),
                sha: parts[0].to_string(),
                short_sha: parts[1].to_string(),
                author: Some(parts[2].to_string()),
                date: Some(parts[3].to_string()),
                message: parts[4].to_string(),
            });
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn git_rebase_start(
    root: String,
    upstream: String,
    items: Vec<RebaseTodoItem>,
) -> Result<GitRebaseResult, String> {
    if items.is_empty() {
        return Err("No commits selected for rebase".to_string());
    }

    let non_dropped: Vec<_> = items
        .iter()
        .filter(|item| {
            let a = item.action.trim().to_lowercase();
            a != "drop" && a != "d"
        })
        .collect();

    if non_dropped.is_empty() {
        return Err("Cannot drop all commits in rebase plan".to_string());
    }

    let first_action = non_dropped[0].action.trim().to_lowercase();
    if first_action == "squash" || first_action == "s" || first_action == "fixup" || first_action == "f" {
        return Err(format!(
            "Cannot {} the first commit in the rebase plan",
            non_dropped[0].action.trim()
        ));
    }

    let status = git_rebase_status(root.clone())?;
    if status.in_progress || status.cherry_pick_in_progress {
        return Err("Another rebase or cherry-pick is already in progress".to_string());
    }

    let git_dir = resolve_git_dir(&root)?;
    let ctx = RebaseScriptContext::new(&git_dir)?;
    let todo_file = ctx.rebase_dir.join("todo.txt");
    let msgs_dir = ctx.rebase_dir.join("msgs");
    std::fs::create_dir_all(&msgs_dir).map_err(|e| e.to_string())?;

    let mut todo_content = String::new();
    for item in &items {
        let action = match item.action.trim().to_lowercase().as_str() {
            "pick" | "p" => "pick",
            "reword" | "r" => "reword",
            "edit" | "e" => "edit",
            "squash" | "s" => "squash",
            "fixup" | "f" => "fixup",
            "drop" | "d" => "drop",
            other => return Err(format!("Invalid rebase action '{other}'")),
        };
        todo_content.push_str(&format!("{} {} {}\n", action, item.sha, item.message));
        if action == "reword" {
            let _ = std::fs::write(msgs_dir.join(format!("{}.txt", item.sha)), &item.message);
            let _ = std::fs::write(msgs_dir.join(format!("{}.txt", item.short_sha)), &item.message);
        }
    }
    std::fs::write(&todo_file, todo_content).map_err(|e| e.to_string())?;
    ctx.write_scripts(&todo_file, &msgs_dir)?;

    let trimmed_upstream = upstream.trim();
    let is_root = trimmed_upstream == "--root" || trimmed_upstream.eq_ignore_ascii_case("root");

    let mut rebase_args = vec!["rebase".to_string(), "-i".to_string()];
    if is_root {
        rebase_args.push("--root".to_string());
    } else {
        let target = if trimmed_upstream.is_empty() {
            "HEAD~1".to_string()
        } else {
            if trimmed_upstream.starts_with('-') {
                return Err("Invalid upstream: cannot start with '-' (except '--root')".to_string());
            }
            trimmed_upstream.to_string()
        };
        rebase_args.push(target);
    }

    let seq_editor_str = ctx.seq_editor_cmd();
    let msg_editor_str = ctx.msg_editor_cmd();

    let res = exec_git(
        &root,
        &rebase_args,
        &[
            ("GIT_SEQUENCE_EDITOR", &seq_editor_str),
            ("GIT_EDITOR", &msg_editor_str),
        ],
    )?;

    let new_status = git_rebase_status(root.clone())?;
    if res.success || !new_status.in_progress {
        cleanup_rebase_metadata(&git_dir);
        return Ok(GitRebaseResult {
            success: true,
            status: "complete".to_string(),
            message: "Rebase completed successfully".to_string(),
            current_commit: None,
            conflicts: Vec::new(),
        });
    }

    if new_status.has_conflicts {
        return Ok(GitRebaseResult {
            success: false,
            status: "conflict".to_string(),
            message: "Rebase stopped due to conflicts. Resolve conflicts and continue.".to_string(),
            current_commit: new_status.current_commit,
            conflicts: new_status.conflicts,
        });
    } else {
        return Ok(GitRebaseResult {
            success: true,
            status: "stopped".to_string(),
            message: format!(
                "Rebase stopped at commit {}. Amend changes and continue.",
                new_status.current_commit.as_deref().unwrap_or("")
            ),
            current_commit: new_status.current_commit,
            conflicts: Vec::new(),
        });
    }
}

#[tauri::command]
pub fn git_rebase_continue(root: String) -> Result<GitRebaseResult, String> {
    let git_dir = resolve_git_dir(&root)?;
    let msg_editor_cmd = get_msg_editor_cmd(&git_dir);

    let res = exec_git(
        &root,
        &["rebase".into(), "--continue".into()],
        &[("GIT_EDITOR", &msg_editor_cmd)],
    )?;

    let new_status = git_rebase_status(root.clone())?;
    if res.success || !new_status.in_progress {
        cleanup_rebase_metadata(&git_dir);
        return Ok(GitRebaseResult {
            success: true,
            status: "complete".to_string(),
            message: "Rebase completed successfully".to_string(),
            current_commit: None,
            conflicts: Vec::new(),
        });
    }

    if new_status.has_conflicts {
        return Ok(GitRebaseResult {
            success: false,
            status: "conflict".to_string(),
            message: "Rebase stopped due to conflicts. Resolve conflicts and continue.".to_string(),
            current_commit: new_status.current_commit,
            conflicts: new_status.conflicts,
        });
    }

    Ok(GitRebaseResult {
        success: true,
        status: "stopped".to_string(),
        message: format!(
            "Rebase stopped at commit {}. Amend changes and continue.",
            new_status.current_commit.as_deref().unwrap_or("")
        ),
        current_commit: new_status.current_commit,
        conflicts: Vec::new(),
    })
}

#[tauri::command]
pub fn git_rebase_abort(root: String) -> Result<(), String> {
    if let Ok(git_dir) = resolve_git_dir(&root) {
        cleanup_rebase_metadata(&git_dir);
    }
    run_git(&root, &["rebase".into(), "--abort".into()]).map(|_| ())
}

#[tauri::command]
pub fn git_rebase_skip(root: String) -> Result<GitRebaseResult, String> {
    let git_dir = resolve_git_dir(&root)?;
    let msg_editor_cmd = get_msg_editor_cmd(&git_dir);

    let res = exec_git(
        &root,
        &["rebase".into(), "--skip".into()],
        &[("GIT_EDITOR", &msg_editor_cmd)],
    )?;

    let new_status = git_rebase_status(root.clone())?;
    if res.success || !new_status.in_progress {
        cleanup_rebase_metadata(&git_dir);
        return Ok(GitRebaseResult {
            success: true,
            status: "complete".to_string(),
            message: "Rebase completed successfully".to_string(),
            current_commit: None,
            conflicts: Vec::new(),
        });
    }

    if new_status.has_conflicts {
        return Ok(GitRebaseResult {
            success: false,
            status: "conflict".to_string(),
            message: "Rebase stopped due to conflicts. Resolve conflicts and continue.".to_string(),
            current_commit: new_status.current_commit,
            conflicts: new_status.conflicts,
        });
    }

    Ok(GitRebaseResult {
        success: true,
        status: "stopped".to_string(),
        message: format!(
            "Rebase stopped at commit {}. Amend changes and continue.",
            new_status.current_commit.as_deref().unwrap_or("")
        ),
        current_commit: new_status.current_commit,
        conflicts: Vec::new(),
    })
}

#[tauri::command]
pub fn git_cherry_pick(
    root: String,
    commit: String,
    no_commit: bool,
) -> Result<GitCherryPickResult, String> {
    let trimmed = commit.trim();
    if trimmed.is_empty() {
        return Err("Commit SHA cannot be empty".to_string());
    }
    if trimmed.starts_with('-') {
        return Err("Invalid commit reference: cannot start with '-'".to_string());
    }

    let mut args = vec!["cherry-pick".to_string()];
    if no_commit {
        args.push("-n".to_string());
    }
    args.push(trimmed.to_string());

    let res = exec_git(&root, &args, &[("GIT_EDITOR", "true")])?;

    if res.success {
        return Ok(GitCherryPickResult {
            success: true,
            status: "complete".to_string(),
            message: format!("Successfully cherry-picked {}", trimmed),
            conflicts: Vec::new(),
        });
    }

    let conflicts = get_conflicted_files(&root);
    if !conflicts.is_empty() {
        return Ok(GitCherryPickResult {
            success: false,
            status: "conflict".to_string(),
            message: format!("Cherry-pick conflict in {} file(s)", conflicts.len()),
            conflicts,
        });
    }

    let err = if res.stderr.trim().is_empty() {
        res.stdout.trim().to_string()
    } else {
        res.stderr.trim().to_string()
    };
    Err(if err.is_empty() {
        "Cherry-pick failed".to_string()
    } else {
        err
    })
}

#[tauri::command]
pub fn git_cherry_pick_continue(root: String) -> Result<GitCherryPickResult, String> {
    let res = exec_git(
        &root,
        &["cherry-pick".into(), "--continue".into()],
        &[("GIT_EDITOR", "true")],
    )?;

    if res.success {
        return Ok(GitCherryPickResult {
            success: true,
            status: "complete".to_string(),
            message: "Cherry-pick completed successfully".to_string(),
            conflicts: Vec::new(),
        });
    }

    let conflicts = get_conflicted_files(&root);
    if !conflicts.is_empty() {
        return Ok(GitCherryPickResult {
            success: false,
            status: "conflict".to_string(),
            message: format!("Cherry-pick has conflicts in {} file(s)", conflicts.len()),
            conflicts,
        });
    }

    let err = if res.stderr.trim().is_empty() {
        res.stdout.trim().to_string()
    } else {
        res.stderr.trim().to_string()
    };
    Err(if err.is_empty() {
        "Cherry-pick continue failed".to_string()
    } else {
        err
    })
}

#[tauri::command]
pub fn git_cherry_pick_abort(root: String) -> Result<(), String> {
    run_git(&root, &["cherry-pick".into(), "--abort".into()]).map(|_| ())
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

    #[test]
    fn git_log_and_rebase_integration() {
        let base_dir = std::env::temp_dir().join(format!("t3d-rebase-test-{}", std::process::id()));
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

        std::fs::write(base_dir.join("file1.txt"), "content 1\n").unwrap();
        run_in(&base_dir, &["add", "file1.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "commit 1"]);
        run_in(&base_dir, &["branch", "-M", "main"]);

        std::fs::write(base_dir.join("file2.txt"), "content 2\n").unwrap();
        run_in(&base_dir, &["add", "file2.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "commit 2"]);

        std::fs::write(base_dir.join("file3.txt"), "content 3\n").unwrap();
        run_in(&base_dir, &["add", "file3.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "commit 3"]);

        let root_str = base_dir.display().to_string();

        // 1. Test git_log
        let logs = super::git_log(root_str.clone(), Some(10), None).expect("git_log");
        assert_eq!(logs.len(), 3);
        assert_eq!(logs[0].message, "commit 3");
        assert_eq!(logs[1].message, "commit 2");
        assert_eq!(logs[2].message, "commit 1");
        assert_eq!(logs[0].author, "Tomlin7");
        assert!(!logs[0].date.is_empty());
        assert_eq!(logs[0].short_sha, &logs[0].sha[..7]);

        // 2. Test git_rebase_status initially
        let init_status = super::git_rebase_status(root_str.clone()).expect("git_rebase_status");
        assert!(!init_status.in_progress);
        assert!(!init_status.cherry_pick_in_progress);
        assert!(!init_status.has_conflicts);

        // 3. Test git_rebase_todo
        let todos = super::git_rebase_todo(root_str.clone(), "HEAD~2".into()).expect("git_rebase_todo");
        assert_eq!(todos.len(), 2);
        // oldest commit first in todo list
        assert_eq!(todos[0].message, "commit 2");
        assert_eq!(todos[1].message, "commit 3");

        // 4. Test git_rebase_start: reorder commits and reword commit 2
        let reordered_items = vec![
            super::RebaseTodoItem {
                action: "pick".to_string(),
                sha: todos[1].sha.clone(),
                short_sha: todos[1].short_sha.clone(),
                message: todos[1].message.clone(),
                author: todos[1].author.clone(),
                date: todos[1].date.clone(),
            },
            super::RebaseTodoItem {
                action: "reword".to_string(),
                sha: todos[0].sha.clone(),
                short_sha: todos[0].short_sha.clone(),
                message: "commit 2 reworded".to_string(),
                author: todos[0].author.clone(),
                date: todos[0].date.clone(),
            },
        ];

        let start_res = super::git_rebase_start(
            root_str.clone(),
            "HEAD~2".into(),
            reordered_items.clone(),
        ).expect("git_rebase_start");
        assert!(start_res.success);
        assert_eq!(start_res.status, "complete");

        // Verify with git_log that commit 2 reworded is now HEAD and commit 3 is HEAD~1
        let after_rebase_logs = super::git_log(root_str.clone(), Some(3), None).expect("git_log after rebase");
        assert_eq!(after_rebase_logs[0].message, "commit 2 reworded");
        assert_eq!(after_rebase_logs[1].message, "commit 3");
        assert_eq!(after_rebase_logs[2].message, "commit 1");

        // 5. Test rebase conflict and abort
        std::fs::write(base_dir.join("conflict.txt"), "line original\n").unwrap();
        run_in(&base_dir, &["add", "conflict.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "base conflict commit"]);

        std::fs::write(base_dir.join("conflict.txt"), "line branch A\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "change A"]);

        std::fs::write(base_dir.join("conflict.txt"), "line branch B\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "change B"]);

        let conflict_todos = super::git_rebase_todo(root_str.clone(), "HEAD~2".into()).expect("git_rebase_todo 2");
        assert_eq!(conflict_todos.len(), 2);

        // Dropping change A and picking change B directly onto base will cause conflict in conflict.txt
        let conflict_plan = vec![
            super::RebaseTodoItem {
                action: "drop".to_string(),
                sha: conflict_todos[0].sha.clone(),
                short_sha: conflict_todos[0].short_sha.clone(),
                message: conflict_todos[0].message.clone(),
                author: conflict_todos[0].author.clone(),
                date: conflict_todos[0].date.clone(),
            },
            super::RebaseTodoItem {
                action: "pick".to_string(),
                sha: conflict_todos[1].sha.clone(),
                short_sha: conflict_todos[1].short_sha.clone(),
                message: conflict_todos[1].message.clone(),
                author: conflict_todos[1].author.clone(),
                date: conflict_todos[1].date.clone(),
            },
        ];

        let conf_res = super::git_rebase_start(root_str.clone(), "HEAD~2".into(), conflict_plan).expect("rebase conflict");
        assert!(!conf_res.success);
        assert_eq!(conf_res.status, "conflict");
        assert!(conf_res.conflicts.contains(&"conflict.txt".to_string()));

        let mid_status = super::git_rebase_status(root_str.clone()).expect("mid status");
        assert!(mid_status.in_progress);
        assert!(mid_status.has_conflicts);
        assert!(mid_status.conflicts.contains(&"conflict.txt".to_string()));

        // Abort rebase
        super::git_rebase_abort(root_str.clone()).expect("git_rebase_abort");
        let post_abort = super::git_rebase_status(root_str.clone()).expect("post abort");
        assert!(!post_abort.in_progress);
        assert!(!post_abort.has_conflicts);

        let _ = std::fs::remove_dir_all(&base_dir);
    }

    #[test]
    fn git_cherry_pick_integration() {
        let base_dir = std::env::temp_dir().join(format!("t3d-cp-test-{}", std::process::id()));
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

        std::fs::write(base_dir.join("main.txt"), "main branch\n").unwrap();
        run_in(&base_dir, &["add", "main.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "main initial"]);
        run_in(&base_dir, &["branch", "-M", "main"]);

        // Create feature branch with a commit
        run_in(&base_dir, &["checkout", "-b", "feature-cp"]);
        std::fs::write(base_dir.join("feat.txt"), "feature data\n").unwrap();
        run_in(&base_dir, &["add", "feat.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "feature commit"]);

        let feat_sha = {
            let out = std::process::Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(&base_dir)
                .output()
                .unwrap();
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        };

        // Switch back to main
        run_in(&base_dir, &["checkout", "main"]);
        let root_str = base_dir.display().to_string();

        // 1. Cherry-pick the feature commit
        let cp_res = super::git_cherry_pick(root_str.clone(), feat_sha.clone(), false).expect("git_cherry_pick");
        assert!(cp_res.success);
        assert_eq!(cp_res.status, "complete");
        assert!(base_dir.join("feat.txt").exists());

        let logs = super::git_log(root_str.clone(), Some(2), None).expect("git_log");
        assert_eq!(logs[0].message, "feature commit");

        // 2. Cherry-pick with no-commit
        run_in(&base_dir, &["checkout", "feature-cp"]);
        std::fs::write(base_dir.join("nocommit.txt"), "nocommit data\n").unwrap();
        run_in(&base_dir, &["add", "nocommit.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "no commit test"]);

        let nocommit_sha = {
            let out = std::process::Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(&base_dir)
                .output()
                .unwrap();
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        };

        run_in(&base_dir, &["checkout", "main"]);
        let cp_nc_res = super::git_cherry_pick(root_str.clone(), nocommit_sha, true).expect("cherry-pick no-commit");
        assert!(cp_nc_res.success);
        assert_eq!(cp_nc_res.status, "complete");
        assert!(base_dir.join("nocommit.txt").exists());

        // Working tree should have staged change but HEAD message is still "feature commit"
        let logs_nc = super::git_log(root_str.clone(), Some(1), None).expect("git_log after nc");
        assert_eq!(logs_nc[0].message, "feature commit");

        // Reset changes
        run_in(&base_dir, &["reset", "--hard", "HEAD"]);

        // 3. Cherry-pick conflict and abort
        // Create conflicting commit on feature branch
        run_in(&base_dir, &["checkout", "-b", "conflict-cp"]);
        std::fs::write(base_dir.join("feat.txt"), "conflicting feature data\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "conflict commit"]);
        let conflict_sha = {
            let out = std::process::Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(&base_dir)
                .output()
                .unwrap();
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        };

        run_in(&base_dir, &["checkout", "main"]);
        std::fs::write(base_dir.join("feat.txt"), "main conflicting data\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "main conflicting change"]);
        let cp_conf_res = super::git_cherry_pick(root_str.clone(), conflict_sha, false).expect("cherry-pick conflict");
        assert!(!cp_conf_res.success);
        assert_eq!(cp_conf_res.status, "conflict");
        assert!(cp_conf_res.conflicts.contains(&"feat.txt".to_string()));

        let cp_status = super::git_rebase_status(root_str.clone()).expect("cp status");
        assert!(cp_status.cherry_pick_in_progress);
        assert!(cp_status.has_conflicts);

        // Abort cherry-pick
        super::git_cherry_pick_abort(root_str.clone()).expect("cherry-pick abort");
        let cp_after_abort = super::git_rebase_status(root_str.clone()).expect("cp after abort");
        assert!(!cp_after_abort.cherry_pick_in_progress);
        assert!(!cp_after_abort.has_conflicts);

        let _ = std::fs::remove_dir_all(&base_dir);
    }

    #[test]
    fn git_rebase_conflict_continue_preserves_reword() {
        let base_dir = std::env::temp_dir().join(format!("t3d-rebase-cont-{}", std::process::id()));
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

        std::fs::write(base_dir.join("file.txt"), "base\n").unwrap();
        run_in(&base_dir, &["add", "file.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "base commit"]);

        std::fs::write(base_dir.join("file.txt"), "change 1\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "change 1"]);

        std::fs::write(base_dir.join("msg.txt"), "change 2 msg\n").unwrap();
        run_in(&base_dir, &["add", "msg.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "change 2"]);

        let root_str = base_dir.display().to_string();
        let todos = super::git_rebase_todo(root_str.clone(), "HEAD~2".into()).expect("todos");
        assert_eq!(todos.len(), 2);

        // Make base conflict with change 1 by creating a branch onto which we rebase
        run_in(&base_dir, &["checkout", "-b", "onto-branch", "HEAD~2"]);
        std::fs::write(base_dir.join("file.txt"), "conflicting base\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "onto conflicting"]);
        run_in(&base_dir, &["checkout", "main"]);

        let plan = vec![
            super::RebaseTodoItem {
                action: "pick".to_string(),
                sha: todos[0].sha.clone(),
                short_sha: todos[0].short_sha.clone(),
                message: todos[0].message.clone(),
                author: todos[0].author.clone(),
                date: todos[0].date.clone(),
            },
            super::RebaseTodoItem {
                action: "reword".to_string(),
                sha: todos[1].sha.clone(),
                short_sha: todos[1].short_sha.clone(),
                message: "change 2 brand new message".to_string(),
                author: todos[1].author.clone(),
                date: todos[1].date.clone(),
            },
        ];

        let start_res = super::git_rebase_start(root_str.clone(), "onto-branch".into(), plan).expect("start");
        assert_eq!(start_res.status, "conflict");
        assert!(start_res.conflicts.contains(&"file.txt".to_string()));

        // Resolve conflict
        std::fs::write(base_dir.join("file.txt"), "resolved\n").unwrap();
        run_in(&base_dir, &["add", "file.txt"]);

        // Continue rebase: this must preserve and apply the reword message for commit 2!
        let cont_res = super::git_rebase_continue(root_str.clone()).expect("continue");
        assert!(cont_res.success);
        assert_eq!(cont_res.status, "complete");

        let logs = super::git_log(root_str.clone(), Some(2), None).expect("logs");
        assert_eq!(logs[0].message, "change 2 brand new message");

        let _ = std::fs::remove_dir_all(&base_dir);
    }

    #[test]
    fn git_rebase_validation_and_root_and_merges() {
        let base_dir = std::env::temp_dir().join(format!("t3d-rebase-root-{}", std::process::id()));
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

        std::fs::write(base_dir.join("f1.txt"), "root\n").unwrap();
        run_in(&base_dir, &["add", "f1.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "root commit"]);

        std::fs::write(base_dir.join("f2.txt"), "second\n").unwrap();
        run_in(&base_dir, &["add", "f2.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "second commit"]);

        let root_str = base_dir.display().to_string();

        // 1. Validation tests
        assert!(super::git_rebase_start(root_str.clone(), "HEAD~1".into(), vec![]).is_err());
        let all_drop = vec![super::RebaseTodoItem {
            action: "drop".to_string(),
            sha: "dummy".to_string(),
            short_sha: "dum".to_string(),
            message: "msg".to_string(),
            author: None,
            date: None,
        }];
        assert!(super::git_rebase_start(root_str.clone(), "HEAD~1".into(), all_drop).is_err());

        let squash_first = vec![
            super::RebaseTodoItem {
                action: "squash".to_string(),
                sha: "dummy".to_string(),
                short_sha: "dum".to_string(),
                message: "msg".to_string(),
                author: None,
                date: None,
            },
        ];
        assert!(super::git_rebase_start(root_str.clone(), "HEAD~1".into(), squash_first).is_err());

        // Flag injection rejection
        assert!(super::git_rebase_todo(root_str.clone(), "--invalid-flag".into()).is_err());
        assert!(super::git_log(root_str.clone(), None, Some("--invalid-flag".into())).is_err());
        assert!(super::git_cherry_pick(root_str.clone(), "--abort".into(), false).is_err());
        assert!(super::git_cherry_pick(root_str.clone(), "".into(), false).is_err());

        // 2. Root rebase test
        let root_todos = super::git_rebase_todo(root_str.clone(), "--root".into()).expect("root todos");
        assert_eq!(root_todos.len(), 2);
        assert_eq!(root_todos[0].message, "root commit");
        assert_eq!(root_todos[1].message, "second commit");

        // 3. Merge commits exclusion (--no-merges)
        run_in(&base_dir, &["checkout", "-b", "feat-branch"]);
        std::fs::write(base_dir.join("f3.txt"), "feat\n").unwrap();
        run_in(&base_dir, &["add", "f3.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "feat commit"]);

        run_in(&base_dir, &["checkout", "main"]);
        std::fs::write(base_dir.join("f4.txt"), "main branch\n").unwrap();
        run_in(&base_dir, &["add", "f4.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "main branch commit"]);

        // Merge feat-branch into main
        run_in(&base_dir, &["merge", "--no-ff", "--no-gpg-sign", "-m", "merge commit", "feat-branch"]);

        // Check that git_rebase_todo excludes the merge commit
        let todos_with_merge = super::git_rebase_todo(root_str.clone(), "HEAD~3".into()).expect("todos with merge");
        for t in &todos_with_merge {
            assert_ne!(t.message, "merge commit");
        }

        // 4. Test git_rebase_skip
        // Cause a conflict then skip it
        run_in(&base_dir, &["checkout", "-b", "skip-branch"]);
        std::fs::write(base_dir.join("skip.txt"), "skip branch line\n").unwrap();
        run_in(&base_dir, &["add", "skip.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "skip commit"]);

        run_in(&base_dir, &["checkout", "main"]);
        std::fs::write(base_dir.join("skip.txt"), "main conflicting line\n").unwrap();
        run_in(&base_dir, &["add", "skip.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "main conflicting skip"]);

        let skip_todos = super::git_rebase_todo(root_str.clone(), "HEAD~1".into()).expect("skip todos");
        let skip_plan = vec![super::RebaseTodoItem {
            action: "pick".to_string(),
            sha: skip_todos[0].sha.clone(),
            short_sha: skip_todos[0].short_sha.clone(),
            message: skip_todos[0].message.clone(),
            author: skip_todos[0].author.clone(),
            date: skip_todos[0].date.clone(),
        }];

        let skip_start = super::git_rebase_start(root_str.clone(), "skip-branch".into(), skip_plan).expect("skip start");
        assert_eq!(skip_start.status, "conflict");

        let skip_res = super::git_rebase_skip(root_str.clone()).expect("git_rebase_skip");
        assert!(skip_res.success);
        assert_eq!(skip_res.status, "complete");

        let _ = std::fs::remove_dir_all(&base_dir);
    }

    #[test]
    fn git_cherry_pick_continue_integration() {
        let base_dir = std::env::temp_dir().join(format!("t3d-cp-cont-{}", std::process::id()));
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

        std::fs::write(base_dir.join("a.txt"), "base line\n").unwrap();
        run_in(&base_dir, &["add", "a.txt"]);
        run_in(&base_dir, &["commit", "--no-gpg-sign", "-m", "base"]);

        run_in(&base_dir, &["checkout", "-b", "cp-source"]);
        std::fs::write(base_dir.join("a.txt"), "source line\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "source change"]);
        let source_sha = {
            let out = std::process::Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(&base_dir)
                .output()
                .unwrap();
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        };

        run_in(&base_dir, &["checkout", "main"]);
        std::fs::write(base_dir.join("a.txt"), "target conflicting line\n").unwrap();
        run_in(&base_dir, &["commit", "-am", "main conflicting change"]);

        let root_str = base_dir.display().to_string();
        let res = super::git_cherry_pick(root_str.clone(), source_sha, false).expect("cherry-pick conflict");
        assert_eq!(res.status, "conflict");

        // Resolve conflict
        std::fs::write(base_dir.join("a.txt"), "resolved cherry pick\n").unwrap();
        run_in(&base_dir, &["add", "a.txt"]);

        // Continue cherry-pick
        let cont_res = super::git_cherry_pick_continue(root_str.clone()).expect("continue cherry-pick");
        assert!(cont_res.success);
        assert_eq!(cont_res.status, "complete");

        let status = super::git_rebase_status(root_str.clone()).expect("status");
        assert!(!status.cherry_pick_in_progress);

        let _ = std::fs::remove_dir_all(&base_dir);
    }
}

