import git

class Utils:
    @staticmethod
    def is_git_repo(path):
        try:
            _ = git.Repo(path).git_dir
            return True
        except git.exc.InvalidGitRepositoryError:
            return False
