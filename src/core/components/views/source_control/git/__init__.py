import git

from .repo import GitRepo
from .tree import GitTree

from .toolbar import GitTreeToolbar
from .container import GitTreeContainer


class Git(git.Git):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master

        self.repo = None

    def open_repo(self):
        try:
            self.repo = repo.GitRepo(self.base.active_dir)
            self.base.set_git_found(True)
        except git.exc.InvalidGitRepositoryError:
            self.base.set_git_found(False)

    def get_version(self):
        return self.version()
    
    def get_active_branch(self):
        return self.repo.active_branch
