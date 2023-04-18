import git

def is_git_repo(path):
    try:
        _ = git.Repo(path).git_dir
        return True
    except Exception:
        return False
