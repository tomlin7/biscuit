import tkinter as tk

from ...utils import IconLabelButton, Frame, Label
from ..editor import BaseEditor


class Welcome(BaseEditor):
    name = "welcome"
    
    def __init__(self, master, exists=False, editable=False, *args, **kwargs):
        super().__init__(master, exists=exists, editable=editable, *args, **kwargs)
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

        self.create_start_group()

        self.logo = Label(self.right, image=self.base.settings.res.logo, **self.base.theme.editors.biscuit_labels)
        self.logo.grid(row=0, column=0, sticky=tk.NSEW)
    
    def create_start_group(self):
        Label(self.left, text="Start", font=("Segoe UI", 15), **self.base.theme.editors.labels).grid(row=2, column=0, sticky=tk.W, pady=(40, 0))
        start_group = Frame(self.left, **self.base.theme.editors)
        start_group.grid(row=3, column=0, sticky=tk.EW)

        IconLabelButton(start_group, "New File...", 'new-file', self.new_file).grid(row=0, column=0, sticky=tk.W, pady=2)
        IconLabelButton(start_group, "Open File...", 'go-to-file', self.open_file).grid(row=1, column=0, sticky=tk.W, pady=2)
        IconLabelButton(start_group, "Open Folder...", 'folder-opened', self.open_folder).grid(row=2, column=0, sticky=tk.W, pady=2)

        #TODO add recents

    def new_file(self, *_):
        self.base.events.new_file()
    
    def open_file(self, *_):
        self.base.events.open_file()
    
    def open_folder(self, *_):
        self.base.events.open_directory()
