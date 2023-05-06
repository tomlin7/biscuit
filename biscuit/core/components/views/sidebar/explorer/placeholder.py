import tkinter as tk

from core.components.utils import WrappingLabel, Button


class DirectoryTreePlaceholder(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(padx=10, pady=10, bg='#f8f8f8')
        self.columnconfigure(0, weight=1)

        WrappingLabel(self, text="You have not yet opened a folder.", font=("Segoe UI", 10), anchor=tk.W, fg="#424242", bg='#f8f8f8').grid(row=0, sticky=tk.EW)

        open_btn = Button(self, text="Open Folder")
        open_btn.bind("<Button-1>", self.open_folder)
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

        WrappingLabel(self, text="You can clone a repository locally.", font=("Segoe UI", 10), anchor=tk.W, fg="#424242", bg='#f8f8f8').grid(row=2, sticky=tk.EW)

        clone_btn = Button(self, text="Clone Repository")
        clone_btn.bind("<Button-1>", self.clone_repo)
        clone_btn.grid(row=3, pady=5, sticky=tk.EW)

    def open_folder(self, *_):
        self.base.events.open_dir()

    def clone_repo(self, *_):
        pass
