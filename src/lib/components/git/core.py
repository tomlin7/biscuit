import git

from lib.components.git import repo


class GitCore(git.Git):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master

        self.repo = None

    def open_repo(self):
        self.repo = repo.GitRepo(self.base.active_dir)

    def get_version(self):
        return self.version()
    
    def get_active_branch(self):
        return self.repo.active_branch
