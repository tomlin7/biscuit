import os
import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconLabelButton, Label, LinkLabel, Shortcut
from biscuit.editor.misc.quickitem import QuickItem, RecentItem

from ..editorbase import BaseEditor


class Welcome(BaseEditor):
    name = "welcome"

    def __init__(self, master, exists=False, editable=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=100, pady=50, **self.base.theme.editors)

        self.filename = "Welcome"

        self.container = Frame(self, **self.base.theme.editors)
        self.container.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        # try:
        #     self.logo = Label(
        #         self.container,
        #         image=self.base.settings.resources.logo.subsample(100, 100),
        #         **self.base.theme.editors.biscuit_labels
        #     )
        #     self.logo.grid(row=0, column=0, sticky=tk.NSEW)
        # except tk.TclError:
        #     pass

        self.title = Label(
            self.container,
            text="BISCUIT",
            font=("Fira Code", int(60 * self.base.scale), "bold"),
            fg=self.base.theme.biscuit,
            **self.base.theme.editors.biscuit_labels
        )
        self.title.pack(fill=tk.BOTH, padx=20)

        self.create_quick_group()

        # TODO: make this optional
        # self.create_recent_group()

    def create_quick_group(self):
        quick = Frame(self.container, **self.base.theme.editors)
        quick.pack(fill=tk.BOTH, expand=True, pady=(20, 0))

        QuickItem(
            quick,
            "New File",
            Icons.NEW_FILE,
            self.base.commands.new_file,
            ["Ctrl", "N"],
        ).pack(fill=tk.X, expand=True)

        QuickItem(
            quick,
            "Open File...",
            Icons.FOLDER_OPENED,
            self.base.commands.open_file,
            ["Ctrl", "O"],
        ).pack(fill=tk.X, expand=True)

        QuickItem(
            quick,
            "Open Folder...",
            Icons.FOLDER,
            self.base.commands.open_directory,
            ["Ctrl", "Shift", "O"],
        ).pack(fill=tk.X, expand=True)

        # TODO add following shortcuts
        QuickItem(
            quick,
            "Restore recent session",
            Icons.HISTORY,
            self.base.commands.restore_recent_session,
            ["Ctrl", "Alt", "R"],
        ).pack(fill=tk.X, expand=True)

        QuickItem(
            quick,
            "Config",
            Icons.SETTINGS,
            self.base.commands.open_settings,
            ["Ctrl", ","],
        ).pack(fill=tk.X, expand=True)

        QuickItem(
            quick,
            "Extensions",
            Icons.EXTENSIONS,
            self.base.commands.show_extensions,
            ["Ctrl", "Shift", "X"],
        ).pack(fill=tk.X, expand=True)

        QuickItem(
            quick,
            "Toggle Vim Mode",
            Icons.KEYBOARD,
            self.base.commands.toggle_vim_mode,
            ["Ctrl", "Shift", "V"],
        ).pack(fill=tk.X, expand=True)

    def create_recent_group(self):
        Label(
            self.container,
            text="Recently opened",
            font=("Fira Code", 15),
            **self.base.theme.editors.labels
        ).pack(pady=(40, 0), anchor=tk.W)
        recents = Frame(self.container, **self.base.theme.editors)
        recents.pack(fill=tk.BOTH, expand=True, padx=5)
        recents.grid_columnconfigure(0, weight=1)

        for i, p in enumerate(self.base.history.folder_history.list):
            RecentItem(recents, os.path.basename(p[0]), p[1]).grid(
                row=i, column=0, sticky=tk.EW, pady=2
            )
