import tkinter as tk

from ....components.terminal import Terminal


class RightBottomPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.HORIZONTAL)

        self.terminal = Terminal(self)
        self.add(self.terminal)
