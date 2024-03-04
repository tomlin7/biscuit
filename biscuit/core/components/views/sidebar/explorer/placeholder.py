import tkinter as tk

from biscuit.core.components.utils import Button, Frame, WrappingLabel


class DirectoryTreePlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(self, text="You have not yet opened a folder.", font=("Segoe UI", 10), anchor=tk.W, **self.base.theme.views.sidebar.item.content).grid(row=0, sticky=tk.EW)

        open_btn = Button(self, text="Open Folder")
        open_btn.bind("<Button-1>", self.open_folder)
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

        WrappingLabel(self, text="You can clone a repository locally.", font=("Segoe UI", 10), anchor=tk.W, **self.base.theme.views.sidebar.item.content).grid(row=2, sticky=tk.EW)

        clone_btn = Button(self, text="Clone Repository")
        clone_btn.bind("<Button-1>", self.clone_repo)
        clone_btn.grid(row=3, pady=5, sticky=tk.EW)

    def open_folder(self, *_) -> None:
        self.base.events.open_directory()

    def clone_repo(self, *_) -> None:
        self.base.palette.show("clone")
