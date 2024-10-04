import os
import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Bubble, Frame, IconButton, Label, Menubutton

KINDS = [
    ("D", "Deleted", "red"),
    ("A", "Added", "green"),
    ("M", "Modified", "orange"),
    ("U", "Untracked", "green"),
]


class ChangeItem(Frame):
    """
    Changes tree item.
    Kinds:
        0 - deleted
        1 - added
        2 - modified
        3 - untracked
    """

    def __init__(self, master, path, kind, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)
        self.path = path
        self.kind = kind

        name_label = Menubutton(
            self,
            text=os.path.basename(path),
            anchor=tk.W,
            font=self.base.settings.uifont,
            padx=10,
            pady=2,
            **self.base.theme.views.sidebar.item.button,
        )
        name_label.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        name_label.bind("<Double-Button-1>", self.open_diff)

        # path_label = TruncatedLabel(self, text=path, anchor=tk.W, font=("Segoe UI", 9),
        #     padx=10, pady=2, fg="grey", **self.base.theme.views.sidebar.item
        # )
        # path_label.pack(fill=tk.BOTH, side=tk.LEFT)
        # path_label.bind("<Double-Button-1>", self.open_diff)

        IconButton(
            self,
            Icons.DISCARD,
            self.git_discard,
            **self.base.theme.views.sidebar.item.button,
        ).pack(fill=tk.BOTH, side=tk.LEFT)
        IconButton(
            self, Icons.ADD, self.git_add, **self.base.theme.views.sidebar.item.button
        ).pack(fill=tk.BOTH, side=tk.LEFT)
        Label(
            self,
            text=KINDS[self.kind][0],
            fg=KINDS[self.kind][2],
            font=self.base.settings.uifont_bold,
            width=3,
            pady=2,
            **self.base.theme.views.sidebar.item,
        ).pack(fill=tk.BOTH, expand=True)

        self.bubble = Bubble(self, text=f"{path} • {KINDS[self.kind][1]}")
        self.bind("<Enter>", self.bubble.show)
        self.bind("<Leave>", self.bubble.hide)

    def open_diff(self, _) -> None:
        self.base.open_diff(self.path, self.kind)

    def git_add(self, *_) -> None:
        self.base.git.repo.stage_files((self.path, self.kind))
        self.master.master.open_repo()

    def git_discard(self, *_) -> None:
        self.base.git.repo.discard_changes(self.path)
        self.master.master.open_repo()
