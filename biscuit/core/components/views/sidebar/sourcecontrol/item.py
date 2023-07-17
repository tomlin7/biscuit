import os
import tkinter as tk

from core.components.utils import Menubutton, Frame, IconButton, Bubble, Label


KINDS = [("D", "Deleted", "red"), ("A", "Added", "green"), ("M", "Modified", "orange")]

class TreeItem(Frame):
    """
    Changes tree item.
    Kinds:
        0 - deleted
        1 - added
        2 - modified
    """
    def __init__(self, master, path, kind, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.path = path
        self.kind = kind

        self.diff_btn = Menubutton(self, text=os.path.basename(path), anchor=tk.W, font=("Segoe UI", 10),
            padx=10, pady=2, **self.base.theme.views.sidebar.item.button
        )
        self.diff_btn.bind("<Double-Button-1>", self.open_diff)
        self.diff_btn.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        IconButton(self, "add", self.git_add, **self.base.theme.views.sidebar.item.button).pack(fill=tk.BOTH, side=tk.LEFT)
        Label(self, text=KINDS[self.kind][0], fg=KINDS[self.kind][2], font=("Segoe UI", 11, "bold"), padx=5, pady=2, **self.base.theme.views.sidebar.item).pack(fill=tk.BOTH)

        self.bubble = Bubble(self, text=f"{path} • {KINDS[self.kind][1]}")
        self.bind('<Enter>', self.bubble.show)
        self.bind('<Leave>', self.bubble.hide)

    def open_diff(self, _):
        self.base.open_diff(self.path)
    
    def git_add(self, *_):
        self.base.git.repo.add_files(self.path)
        self.master.master.open_repo()
