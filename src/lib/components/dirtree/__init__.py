import tkinter as tk

from .tree import DirTreeTree
from .utils.toolbar import DirTreeToolbar

from ..sidebar.pane import SidePane
from ..utils.scrollbar import AutoScrollbar
from ..placeholders.emptydirtree import EmptyDirTree

class DirTreePane(SidePane):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.label = tk.Label(self, text="Explorer", anchor=tk.W, padx=10, pady=10)
        self.label.grid(row=0, column=0, sticky=tk.EW)

        self.toolbar = DirTreeToolbar(self)
        self.toolbar.grid(row=1, column=0, sticky=tk.EW)

        self.tree_active = False

        self.emptytree = EmptyDirTree(self)
        self.emptytree.grid(row=2, column=0, sticky=tk.NSEW)

        self.tree = DirTreeTree(self, selectmode=tk.BROWSE)
        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        
        self.tree.configure(yscrollcommand=self.tree_scrollbar.set)
        self.update_panes()
    
    def create_root(self, startpath):
        self.tree.create_root(startpath)
        self.toolbar.update_dirname()
    
    def disable_tree(self):
        if self.tree_active:
            self.tree.grid_remove()
            self.tree_scrollbar.grid_remove()
            self.emptytree.grid()
            self.tree_active = False
    
    def enable_tree(self):
        if not self.tree_active:
            self.emptytree.grid_remove()
            self.tree.grid(row=2, column=0, sticky=tk.NSEW)
            self.tree_scrollbar.grid(row=2, column=1, sticky=tk.NS)
            self.tree_active = True
    
    def update_panes(self):
        if self.base.active_dir is not None:
            self.enable_tree()
        else:
            self.disable_tree()
