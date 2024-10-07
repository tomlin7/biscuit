import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Button, Frame, IconLabelButton, WrappingLabel


class DirectoryTreePlaceholder(Frame):
    """Placeholder view for the directory tree.

    The DirectoryTreePlaceholder is displayed when the user has not yet opened a folder.
    - The user can open a folder or clone a repository locally.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(
            self,
            text="No folder opened",
            font=self.base.settings.uifont,
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content
        ).grid(row=0, sticky=tk.EW)

        open_btn = Button(
            self,
            text="Open Folder",
            command=self.open_folder,
            pady=2,
        )
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

        clone_btn = Button(
            self,
            text="Clone Repo",
            command=self.clone_repo,
            pady=2,
        )
        clone_btn.grid(row=3, sticky=tk.EW)

    def open_folder(self, *_) -> None:
        self.base.commands.open_directory()

    def clone_repo(self, *_) -> None:
        self.base.palette.show("clone:")
