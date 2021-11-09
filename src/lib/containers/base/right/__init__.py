import tkinter as tk

from .top import RightTopPane
from ....components.terminal import TerminalPane

class RightPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.VERTICAL)

        self.top = RightTopPane(self, height=520) #, opaqueresize=False)
        self.terminal = TerminalPane(self, active=False)

        self.add(self.top)
        # self.add(self.terminal)
