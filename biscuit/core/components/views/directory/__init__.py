import tkinter as tk
from tkinter.constants import *

from .. import View
from .tree import Tree
from .toolbar import DirectoryTreeToolbar
from ...utils.scrollbar import AutoScrollbar


class DirectoryTree(View):
    def __init__(self, master, double_click=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        self._tree = Tree(self, double_click=double_click, selectmode=tk.BROWSE)
        self.tree_scrollbar = AutoScrollbar(self, orient=VERTICAL, command=self._tree.yview)
        self.tree_scrollbar.config(style="TreeScrollbar")
        
        self._tree.grid(row=0, column=0, sticky=NSEW)
        self.tree_scrollbar.grid(row=0, column=1, sticky=NS)

        self._tree.configure(yscrollcommand=self.tree_scrollbar.set)
    
    def open_directory(self, path):
        self._tree.open_directory(path)
    
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

    def open_directory(self, startpath):
        self.tree.open_directory(startpath)
        self.toolbar.update_dirname()

    def close_directory(self):
        self.close_directory()
        self.toolbar.update_dirname()
    
    def disable_tree(self):
        if self.tree_active:
            self.grid_remove()
            self.emptytree.grid()
            self.tree_active = False
    
    def enable_tree(self):
        if not self.tree_active:
            self.emptytree.grid_remove()
            self.grid(row=2, column=0, sticky=NSEW)
            self.tree_active = True
    
    def update_panes(self):
        if self.base.active_dir is not None:
            self.enable_tree()
        else:
            self.disable_tree()
    
    def openfile(self, event):
        item = self.get_selected_item()
        if self.get_item_type(item) != 'file':
            return

        path = self.get_item_fullpath(item)

        # set active file
        self.base.set_active_file(path)

