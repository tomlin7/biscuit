import tkinter as tk

from .right import RightPane
from ...components.dirtree import DirTreePane
from ...components.sidebar import Sidebar

class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(orient=tk.HORIZONTAL)

        self.right = RightPane(self)
        self.dirtree = DirTreePane(self, active=True, before=self.right)
        self.left_panes = [self.dirtree]

        self.add(self.dirtree)
        self.add(self.right)
