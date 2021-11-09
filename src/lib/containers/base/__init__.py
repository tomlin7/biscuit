import tkinter as tk

from .right import RightPane
from ...components.dirtree import DirTreePane
from ...components.git import GitPane

class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(orient=tk.HORIZONTAL, bd=0, relief=tk.FLAT)

        self.right = RightPane(self)
        self.dirtree = DirTreePane(self, active=False, before=self.right)
        self.git = GitPane(self, active=False, before=self.right)
        self.left_panes = [self.dirtree, self.git]

        # self.add(self.dirtree)
        self.add(self.right)
