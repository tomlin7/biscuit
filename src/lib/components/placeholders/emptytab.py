import tkinter as tk
from tkinter import ttk


class EmptyTab(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.logo_img = self.base.settings.resources.logo.subsample(2)
        self.logo = ttk.Label(self, image=self.logo_img, width=10)
        self.logo.place(anchor=tk.CENTER, relx=.5, rely=.5)

        # +------------------+
        # |     +------+     |
        # |     [ logo ]     |
        # |     +------+     |
        # | [some shortcuts] |
        # |                  |
        # +------------------+
