from tkinter import messagebox
try:
    import git
    from .repo import GitRepo
except ImportError:
    messagebox.showerror("Git not found", "Git is not installed on your PC. Install Git and add Git to the PATH to use Biscuit")


class Git(git.Git):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master

        self.repo = None

    def check_git(self):
        if not self.base.active_directory:
            self.base.git_found = False
            return
        
        try:
            self.repo = GitRepo(self.base.active_directory)
            self.base.git_found = True
        except git.exc.InvalidGitRepositoryError:
            self.base.git_found = False

    def get_version(self):
        return self.version()
    
    @property
    def active_branch(self):
        return self.repo.active_branch
