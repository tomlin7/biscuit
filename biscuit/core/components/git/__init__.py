from tkinter import messagebox

git_available = True
try:
    import git

    from .repo import GitRepo
except importError:
    messagebox.showerror("Git not found", "Git is not installed on your PC. Install Git and add Git to the PATH to use Biscuit")
    git_available = False

class Git(git.Git):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master
        self.repo = None

    def check_git(self):
        if not (git_available and self.base.active_directory):
            self.base.git_found = False
            return
        
        try:
            self.repo = GitRepo(self, self.base.active_directory)
            self.base.git_found = True
        except git.exc.InvalidGitRepositoryError:
            self.base.git_found = False

    def get_version(self):
        if not git_available:
            return

        return self.version()
    
    @property
    def active_branch(self):
        if not git_available:
            return 

        return self.repo.active_branch

    def checkout(self, branch):
        self.repo.index.checkout(branch)
