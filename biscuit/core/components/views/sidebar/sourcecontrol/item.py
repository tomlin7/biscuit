import tkinter as tk

from core.components.utils import Menubutton, Frame, IconButton


class TreeItem(Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.path = path

        IconButton(self, "add", self.git_add).pack(fill=tk.BOTH, side=tk.LEFT)
        
        self.diff_btn = Menubutton(self, text=path, anchor=tk.W, font=("Segoe UI", 10),
            padx=10, pady=2, **self.base.theme.menu.item
        )
        self.diff_btn.bind("<Double-Button-1>", self.open_diff)
        self.diff_btn.pack(fill=tk.BOTH, expand=True)

    def open_diff(self, _):
        self.base.open_diff(self.path)
    
    def git_add(self, *_):
        self.base.git.repo.add_files(self.path)
