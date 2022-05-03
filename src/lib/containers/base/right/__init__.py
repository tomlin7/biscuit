import tkinter as tk

from .top import RightTopPane
from ....components.terminal import TerminalPane

class RightPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.VERTICAL, bd=0, relief=tk.FLAT, opaqueresize=False)

        self.top = RightTopPane(self) #, opaqueresize=False)
        self.terminal = TerminalPane(self, active=False)

        self.add(self.top, height=520)
        # self.add(self.terminal)
