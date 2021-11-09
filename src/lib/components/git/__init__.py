import tkinter as tk
import git, os, threading

from .core import GitCore
from .repo import GitRepo
from .tree import ChangesTree

from ..text import utils
from ..sidebar.pane import SidePane

class GitPane(SidePane):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.core = self.base.git
        
        self.tree = ChangesTree(self)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.tree.heading("#0", text="Changes", anchor=tk.W)
    
    def open_repo_dir(self):
        threading.Thread(target=self.open_repo, args=[self.core.repo]).start()
    
    def open_repo(self, repo):
        untracked_files = repo.untracked_files
        staged_files = [item.a_path for item in repo.index.diff(None)]
        
        self.tree.clean_tree()
        self.tree.add_tree("Staged Changes", staged_files)
        self.tree.add_tree("Changes", untracked_files)
