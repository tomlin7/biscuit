import os
import tkinter as tk

from ...utils import Frame, IconLabelButton, Label, LinkLabel
from ..editor import BaseEditor


class Welcome(BaseEditor):
    name = "welcome"

    def __init__(self, master, exists=False, editable=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=100, pady=50, **self.base.theme.editors)

        self.filename = "Welcome"

        self.left = Frame(self, **self.base.theme.editors)
        self.left.pack(expand=True, side=tk.LEFT, fill=tk.BOTH, anchor=tk.CENTER)

        self.right = Frame(self, **self.base.theme.editors)
        self.right.pack(expand=True, fill=tk.BOTH, anchor=tk.CENTER)

        self.title = Label(self.left, text="Biscuit", font=("Segoe UI", 50), fg=self.base.theme.biscuit, **self.base.theme.editors.biscuit_labels)
        self.title.grid(row=0, column=0, sticky=tk.W)

        self.description = Label(self.left, text="Made with ❤", font=("Segoe UI", 20), fg=self.base.theme.biscuit_dark, **self.base.theme.editors.biscuit_labels)
        self.description.grid(row=1, column=0, sticky=tk.W, pady=5)

        if self.base.get_user_preset("editing.misc.welcome.lucky"):
            lucky_word = self.base.get_user_preset("editing.misc.welcome.lucky")
            self.lucky = Label(self.left, text=lucky_word, font=("Segoe UI", 14), fg=self.base.theme.biscuit_dark, **self.base.theme.editors.biscuit_labels)
            self.lucky.grid(row=2, column=0, sticky=tk.W, pady=1)
        else:
            self.lucky = None

        self.create_start_group()
        self.create_recent_group()

        try:
            self.logo = Label(self.right, image=self.base.settings.res.logo, **self.base.theme.editors.biscuit_labels)
            self.logo.grid(row=0, column=0, sticky=tk.NSEW)
        except tk.TclError:
            pass

    def create_start_group(self):
        Label(self.left, text="Start", font=("Segoe UI", 15), **self.base.theme.editors.labels).grid(row=2, column=0, sticky=tk.W, pady=(40, 0))
        start = Frame(self.left, **self.base.theme.editors)
        start.grid(row=3, column=0, sticky=tk.EW)

        IconLabelButton(start, "New File...", 'new-file', self.new_file).grid(row=0, column=0, sticky=tk.W, pady=2)
        IconLabelButton(start, "Open File...", 'go-to-file', self.open_file).grid(row=1, column=0, sticky=tk.W, pady=2)
        IconLabelButton(start, "Open Folder...", 'folder-opened', self.open_folder).grid(row=2, column=0, sticky=tk.W, pady=2)
    
    def create_recent_group(self):
        Label(self.left, text="Recent", font=("Segoe UI", 15), **self.base.theme.editors.labels).grid(row=4, column=0, sticky=tk.W, pady=(40, 0))
        recents = Frame(self.left, **self.base.theme.editors)
        recents.grid(row=5, column=0, sticky=tk.EW)

        for i, p in enumerate(self.base.history.folder_history.list):
            LinkLabel(recents, os.path.basename(p[0]), p[1]).grid(row=i, column=0, sticky=tk.W, pady=2)

    def new_file(self, *_):
        self.base.events.new_file()

    def open_file(self, *_):
        self.base.events.open_file()

    def open_folder(self, *_):
        self.base.events.open_directory()
