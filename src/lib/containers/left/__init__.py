import tkinter as tk

from ...components.dirtree import DirTree


class LeftPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.VERTICAL)

        self.label = tk.Label(self, text="Explorer", anchor=tk.W)
        self.add(self.label, pady=2, padx=5)

        self.dirtree = DirTree(self, width=30)
        self.add(self.dirtree, sticky=tk.NSEW)
