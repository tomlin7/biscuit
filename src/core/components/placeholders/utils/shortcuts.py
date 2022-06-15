import tkinter as tk
from .shortcut import Shortcut


class Shortcuts(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.bg = master.bg
        self.fg = master.fg

        self.row = 0

    def add_shortcut(self, name, value):
        name = tk.Label(self, text=name, font=("Segoi UI", 10), anchor=tk.E, fg=self.fg, bg=self.bg)
        value = Shortcut(self, shortcuts=value, bg=self.bg)
        
        name.grid(row=self.row, column=0, sticky=tk.EW, pady=5, padx=5)
        value.grid(row=self.row, column=1, sticky=tk.EW, pady=5, padx=5)

        self.row += 1