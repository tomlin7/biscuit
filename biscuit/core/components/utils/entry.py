import tkinter as tk

from hintedtext import HintedEntry

from .frame import Frame


class Entry(Frame):
    def __init__(self, master, hint="", *args, **kwargs) -> None:
        super().__init__(master)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.grid_columnconfigure(0, weight=1)

        self.entry = HintedEntry(self, relief=tk.FLAT, font=("Segoi UI", 10), **self.base.theme.utils.entry, bd=5, hint=hint)
        self.entry.config(*args, **kwargs)
        self.entry.grid(row=0, column=0, sticky=tk.NSEW)

    def insert(self, *args) -> None:
        self.entry.insert(*args)
    
    def get(self, *args) -> str:
        return self.entry.get(*args)
