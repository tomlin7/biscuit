import tkinter as tk

from .frame import Frame


class Shortcut(Frame):
    def __init__(self, master, shortcuts, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.shortcuts = shortcuts
        self.add_shortcuts()

    def add_shortcuts(self):
        for shortcut in self.shortcuts[:-1]:
            self.add_shortcut(shortcut)
            self.add_separator()
        self.add_shortcut(self.shortcuts[-1])

    def add_separator(self):
        tk.Label(self, text="+", **self.base.theme.editors.labels).pack(padx=2, side=tk.LEFT)

    def add_shortcut(self, shortcut):
        tk.Label(
            self, text=shortcut, bg=self.base.theme.border, fg=self.base.theme.biscuit_dark, 
            font=("Consolas", 10)).pack(padx=2, side=tk.LEFT)