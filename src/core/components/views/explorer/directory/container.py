import tkinter as tk

from .tree import Tree
from ....utils.scrollbar import AutoScrollbar


class DirectoryTree(tk.Frame):
    def __init__(self, master, double_click=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        self._tree = Tree(self, double_click=double_click, selectmode=tk.BROWSE)
        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self._tree.yview)
        self.tree_scrollbar.config(style="TreeScrollbar")
        
        self._tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree_scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self._tree.configure(yscrollcommand=self.tree_scrollbar.set)
    
    def open_directory(self, path):
        self._tree.open_directory(path)
    
    def close_directory(self, path):
        self.clear_tree()
    
    def clear_tree(self):
        self._tree.clear_tree()
    
    def get_item_type(self, item):
        return self._tree.item_type(item)
    
    def get_item_fullpath(self, item):
        return self._tree.item_fullpath(item)
    
    def get_selected_item(self):
        return self._tree.focus()
    
    def refresh_tree(self):
        self._tree.refresh_tree()
    
    def collapse_all(self):
        self._tree.collapse_all()
