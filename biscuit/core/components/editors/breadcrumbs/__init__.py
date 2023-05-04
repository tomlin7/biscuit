import os
import tkinter as tk
from .pathview import PathView


class Item(tk.Menubutton):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, font=("Segoe UI", 10), *args, **kwargs)
        self.path = path
        self.config(fg="#818181", bg="#ffffff", height=1, pady=2, padx=1,
                    activebackground="#ffffff", activeforeground="#4e4e4e")


class BreadCrumbs(tk.Frame):
    def __init__(self, master, path=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.config(bg="#ffffff", padx=10)

        self.pathview = PathView(self)

        path = os.path.relpath(path, self.base.active_directory).split('\\')
        for i, item in enumerate(path):
            text = item if item == path[-1] else f"{item} ›"

            btn = Item(self, os.path.join(self.base.active_directory, "\\".join(path[:i])), text=text)
            btn.bind("<Button-1>", self.pathview.show)
            btn.pack(side=tk.LEFT)
