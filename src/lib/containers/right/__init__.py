import tkinter as tk

from .top import RightTopPane
from .bottom import RightBottomPane

class RightPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.VERTICAL)

        self.top = RightTopPane(self, height=520) #, opaqueresize=False)
        self.bottom = RightBottomPane(self, height=280) #, opaqueresize=False)

        self.add(self.top)
        self.add(self.bottom)
