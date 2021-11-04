import tkinter as tk
import git, os, threading

from lib.components.git.core import GitCore
from lib.components.git.repo import GitRepo

from lib.components.git.tree import ChangesTree

from lib.components.text import utils

# TODO: change into git pane later on
class GitWindow(tk.Toplevel):
    def __init__(self, master, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = master
        
        self.core = self.base.git
        self.init_window()
        self.init_widgets()
        self.open_repo_dir()

    def init_window(self):
        self.title("Bisgit")
        self.geometry("400x400")

    def init_widgets(self):
        self.basew = tk.PanedWindow(self, orient=tk.HORIZONTAL, bd=0, sashwidth=5)
        self.basew.pack(fill=tk.BOTH, expand=True)

        self.left = tk.PanedWindow(self.basew, orient=tk.VERTICAL, bd=0)
        self.basew.add(self.left)

        self.right = tk.PanedWindow(self.basew, orient=tk.VERTICAL, bd=0)
        self.basew.add(self.right)

        self.changes = tk.Text(self.right, font=("Consolas", 10), wrap=tk.NONE)
        self.right.add(self.changes, sticky=tk.NSEW)

        self.tree = ChangesTree(self.left)
        self.left.add(self.tree, sticky=tk.NSEW)
        self.tree.heading("#0", text="Changes", anchor=tk.W)
    
    def open_repo_dir(self):
        threading.Thread(target=self.open_repo, args=[self.core.repo]).start()
    
    def open_repo(self, repo):
        untracked_files = repo.untracked_files
        staged_files = [item.a_path for item in repo.index.diff(None)]

        self.changes.delete(0.1, tk.END)
        
        for i in repo.index.diff(None):
            self.changes.insert(tk.END, str(i) + "\n\n")
            self.changes.insert(tk.END, str(i.b_mode) + "\n\n")

        self.changes.insert(tk.END, "◆ Staged\n  ")
        self.changes.insert(tk.END, "\n  ".join(staged_files))

        self.changes.insert(tk.END, "\n\n◇ Untracked\n  ")
        self.changes.insert(tk.END, "\n  ".join(untracked_files))
        
        # tree 🌳
        self.tree.clean_tree()
        self.tree.add_tree("Staged Changes", staged_files)
        self.tree.add_tree("Changes", untracked_files)

        self.title(f"{repo.working_tree_dir}")
        self.wm_geometry("600x300")
