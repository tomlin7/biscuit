import tkinter as tk

from .right import RightPane
from ...components.views import Explorer
from ...components.views import SourceControl

class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(orient=tk.HORIZONTAL, bd=0, relief=tk.FLAT, opaqueresize=False)

        self.right = RightPane(self)
        self.explorer = Explorer(self, active=False, before=self.right)
        self.source_control = SourceControl(self, active=False, before=self.right)
        self.sidebars = [self.explorer, self.source_control]

        self.add(self.right)
