import tkinter as tk

from ....utils import Button, Frame, WrappingLabel


class ChangesTreePlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(self, font=("Segoe UI", 10), anchor=tk.W, **self.base.theme.views.sidebar.item.content,
            text="In order to use git features, you can open a folder containing a git repository or clone from a URL.").grid(row=0, sticky=tk.EW)

        open_btn = Button(self, text="Open Folder")
        open_btn.bind("<Button-1>", self.open_folder)
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

        clone_btn = Button(self, text="Clone Repository")
        clone_btn.bind("<Button-1>", self.clone_repo)
        clone_btn.grid(row=2, pady=5, sticky=tk.EW)

    def open_folder(self, _) -> None:
        self.base.events.open_directory()

    def clone_repo(self, *_) -> None:
        self.base.palette.show_prompt("clone")
