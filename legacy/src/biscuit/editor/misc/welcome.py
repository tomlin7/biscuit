import os
import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, Label
from biscuit.common.ui.icon import BorderedIconButton
from biscuit.editor.misc.quickitem import QuickItem, RecentItem

from ..editorbase import BaseEditor


class Welcome(BaseEditor):
    name = "welcome"

    def __init__(self, master, exists=False, editable=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=100, pady=50, **self.base.theme.editors)

        self.filename = "Welcome"

        self.container = Frame(self, bg=self.base.theme.border)
        self.container.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        # TODO: logo was consuming too much space
        # try:
        #     self.logo = Label(
        #         self.container,
        #         image=self.base.settings.resources.logo.subsample(100, 100),
        #         **self.base.theme.editors.biscuit_labels
        #     )
        #     self.logo.grid(row=0, column=0, sticky=tk.NSEW)
        # except tk.TclError:
        #     pass

        self.left = Frame(self.container, padx=10, **self.base.theme.editors)
        self.left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.title = Label(
            self.left,
            text="BISCUIT",
            font=("Fira Code", int(60 * self.base.scale), "bold"),
            fg=self.base.theme.biscuit,
            **self.base.theme.editors.biscuit_labels
        )
        self.title.pack(fill=tk.BOTH, padx=20)

        self.create_quick_group()

        if self.base.history.folder_history.list:  # TODO: make this optional
            self.right = Frame(self.container, padx=10, bg=self.base.theme.primary_background)
            self.right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, pady=1, padx=1)
            
            self.create_recent_group()

    def create_quick_group(self):
        quick = Frame(self.left, **self.base.theme.editors)
        quick.pack(fill=tk.BOTH, expand=True, pady=(20, 10))

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
            "History",
            Icons.HISTORY,
            self.toggle_history,
            ["Ctrl", "R"],
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

    def create_recent_group(self):
        frame = Frame(self.right, **self.base.theme.views)
        frame.pack(fill=tk.X, pady=10)
        
        Label(
            frame,
            text="HISTORY",
            font=("Fira Code", 20, "bold"),
            fg=self.base.theme.border,
            **self.base.theme.views
        ).pack(anchor=tk.W, side=tk.LEFT)

        BorderedIconButton(
            frame,
            icon=Icons.CLOSE,
            event=self.toggle_history,
            **self.base.theme.views
        ).pack(anchor=tk.E, side=tk.RIGHT, padx=5, pady=5)
        
        # Label(
        #     self.right,
        #     text="----------------------------------",
        #     font=("Fira Code", 13, "bold"),
        #     fg=self.base.theme.border,
        #     **self.base.theme.views
        # ).pack()

        recents = Frame(self.right, width=300, **self.base.theme.views)
        recents.grid_propagate(False)
        recents.pack(fill=tk.BOTH, expand=True)
        recents.grid_columnconfigure(0, weight=1)

        for i, p in enumerate(self.base.history.folder_history.list):
            RecentItem(recents, *p).grid(
                row=i, column=0, sticky=tk.EW, pady=1
            )

        # Button(
        #     self.right,
        #     text="Clear History",
        #     command=self.base.commands.clear_history,
        #     **self.base.theme.editors.button
        # ).pack(pady=(10, 0), anchor=tk.CENTER)

    def toggle_history(self, *_) -> None:
        if self.right.winfo_viewable():
            self.right.pack_forget()
        else:
            self.right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, pady=1, padx=1)