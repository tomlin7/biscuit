import tkinter as tk

from .directory.tree import DirectoryTree
from .directory.toolbar import DirectoryTreeToolbar

from ..sidebar import SideBar
from ..utils.scrollbar import AutoScrollbar
from ..placeholders.dir import DirtreePlaceholder

class Explorer(SideBar):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.name = "Explorer"
        self.icon = "\ueaf0"
        self.tree_active = False

        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.label_frame = tk.Frame(self)
        self.label_frame.config(bg="#f3f3f3")
        self.label_frame.grid(row=0, column=0, sticky=tk.EW)

        self.label = tk.Label(self.label_frame)
        self.label.config(
            text="EXPLORER", font=("Segoe UI", 10), anchor=tk.W, 
            bg="#f3f3f3", fg="#6f6f6f")
        self.label.grid(row=0, column=0, sticky=tk.EW, padx=25, pady=9)

        self.toolbar = DirectoryTreeToolbar(self)
        self.toolbar.grid(row=1, column=0, sticky=tk.EW)

        self.emptytree = DirtreePlaceholder(self)
        self.emptytree.grid(row=2, column=0, sticky=tk.NSEW, padx=25, pady=10)

        self.tree = DirectoryTree(self, selectmode=tk.BROWSE)
        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        
        self.tree.configure(yscrollcommand=self.tree_scrollbar.set)
        self.update_panes()
    
    def create_root(self, startpath):
        self.tree.open_directory(startpath)
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
