import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconLabelButton, WrappingLabel


class ChangesTreePlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(
            self,
            font=self.base.settings.uifont,
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
            text="Open a folder containing a git repository."
        ).grid(row=0, sticky=tk.EW)

        # TODO add init repo button if no repo is found for opened folder

    #     open_btn = IconLabelButton(
    #         self,
    #         text="Open Folder",
    #         icon=Icons.FOLDER,
    #         callback=self.open_folder,
    #         pady=2,
    #         highlighted=True,
    #     )
    #     open_btn.grid(row=1, pady=5, sticky=tk.EW)

    #     clone_btn = IconLabelButton(
    #         self,
    #         text="Clone Repository",
    #         icon=Icons.GIT_COMMIT,
    #         callback=self.clone_repo,
    #         pady=2,
    #         highlighted=True,
    #     )
    #     clone_btn.grid(row=2, pady=5, sticky=tk.EW)

    # def open_folder(self, *_) -> None:
    #     self.base.commands.open_directory()

    # def clone_repo(self, *_) -> None:
    #     self.base.palette.show("clone:")
