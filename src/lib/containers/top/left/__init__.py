import tkinter as tk

from lib.components.dirtree import DirTree

class TopLeftPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.dirtree = DirTree(self, '.')
        self.dirtree.configure(height=25)
        self.add(self.dirtree)
