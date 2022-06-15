import tkinter as tk

from .tree import GitTree
from ....utils.scrollbar import AutoScrollbar


class GitTreeContainer(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        self.tree = GitTree(self, selectmode=tk.BROWSE)
        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree_scrollbar.config(style="TreeScrollbar")
        
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree_scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self.tree.configure(yscrollcommand=self.tree_scrollbar.set)
    
    def open_repo_dir(self):
        self.tree.open_repo_dir()
    
    def clear_tree(self):
        self._tree.clear_tree()
    
    def get_item_type(self, item):
        return self._tree.item_type(item)
    
    def get_item_fullpath(self, item):
        return self._tree.item_fullpath(item)
    
    def get_selected_item(self):
        return self._tree.focus()
