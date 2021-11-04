import tkinter as tk

from ...components.terminal import Terminal


class BottomPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.terminal = Terminal(self)
        self.add(self.terminal)