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

        self.label_frame = tk.Frame(self)
        self.label_frame.config(bg="#E6E6E6")
        self.label_frame.grid(row=0, column=0, sticky=tk.EW)

        self.label = tk.Label(self.label_frame)
        self.label.config(text="EXPLORER", font=("Helvetica", 11), anchor=tk.W, bg="#E6E6E6")
        self.label.grid(row=0, column=0, sticky=tk.EW, padx=25, pady=15)

        self.toolbar = DirTreeToolbar(self)
        self.toolbar.config(bg="#E6E6E6")
        self.toolbar.grid(row=1, column=0, sticky=tk.EW)

        self.tree_active = False

        self.emptytree = EmptyDirTree(self)
        self.emptytree.grid(row=2, column=0, sticky=tk.NSEW, padx=25, pady=10)

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
