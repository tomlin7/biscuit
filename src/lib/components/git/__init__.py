import tkinter as tk
import git, os, threading

from .core import GitCore
from .repo import GitRepo
from .tree import GitTree

from ..text import utils
from ..sidebar.pane import SidePane
from ..utils.scrollbar import AutoScrollbar

class GitPane(SidePane):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.core = self.base.git

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)
        
        self.label = tk.Label(self, text="Source Control", anchor=tk.W, padx=10, pady=10)
        self.label.grid(row=0, column=0, sticky=tk.EW)
        
        self.tree = GitTree(self, selectmode=tk.BROWSE)
        self.tree.grid(row=1, column=0, sticky=tk.NSEW)
        # self.tree.heading("#0", text="Changes", anchor=tk.W)

        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree_scrollbar.grid(row=1, column=1, sticky=tk.NS)
        self.tree.configure(yscrollcommand=self.tree_scrollbar.set)
    
    def enable(self):
        self.open_repo_dir()

    def disable(self):
        self.clear_tree()
    
    def clear_tree(self):
        self.tree.clean_tree()

    def open_repo_dir(self):
        threading.Thread(target=self.open_repo, args=[self.core.repo]).start()
    
    def open_repo(self, repo):
        untracked_files = repo.untracked_files
        staged_files = [item.a_path for item in repo.index.diff(None)]
        
        self.tree.clean_tree()
        self.tree.add_tree("Staged Changes", staged_files)
        self.tree.add_tree("Changes", untracked_files)
