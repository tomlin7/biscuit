import tkinter as tk

from ..sidebar.pane import SidePane
from .tree import DirTreeTree
from ..utils.scrollbar import AutoScrollbar

class DirTreePane(SidePane):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.tree = DirTreeTree(self, selectmode=tk.BROWSE)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

        self.tree_scrollbar = AutoScrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree_scrollbar.grid(row=0, column=1, sticky=tk.NS)
        
        self.tree.configure(yscrollcommand=self.tree_scrollbar.set)
    
    def create_root(self, startpath):
        self.tree.create_root(startpath)
