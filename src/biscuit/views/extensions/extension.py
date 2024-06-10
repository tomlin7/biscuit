import os
import threading
import tkinter as tk

import requests

from src.biscuit.common.ui import Button, Frame, Label


class Extension(Frame):
    """Extension item in the Extensions view.

    The Extension class represents an extension item in the Extensions view.
    """

    def __init__(self, master, name: str, data: list[str], *args, **kwargs) -> None:
        """Initialize the Extension class.

        Args:
            master (tk.Tk): The root window.
            name (str): The name of the extension.
            data (list): The extension data."""

        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.manager = self.base.extensions_manager

        self.data = data
        self.name = name
        self.filename = data[0]
        self.file = os.path.join(self.base.extensionsdir, data[0])
        self.author = data[1]
        self.description = data[2][:35] + "..." if len(data[2]) > 30 else data[2]

        self.url = f"{self.manager.repo_url}extensions/{data[0]}"
        self.installed = os.path.isfile(self.file)

        self.bg = self.base.theme.views.sidebar.item.background
        self.hbg = self.base.theme.views.sidebar.item.highlightbackground

        self.holder = Frame(self, padx=10, pady=20)
        self.holder.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.topholder = Frame(self.holder)
        self.topholder.pack(fill=tk.X, expand=True)

        self.namelbl = Label(
            self,
            text=name[0].upper() + name[1:],
            font=("Segoi UI", 11, "bold"),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.namelbl.pack(in_=self.topholder, side=tk.LEFT, fill=tk.X)

        self.authorlbl = Label(
            self,
            text=f"@{self.author}",
            font=("Segoi UI", 7, "bold"),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.authorlbl.config(fg="grey")
        self.authorlbl.pack(in_=self.topholder, side=tk.RIGHT, fill=tk.X)

        self.descriptionlbl = Label(
            self,
            text=self.description,
            font=("Segoi UI", 9),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.descriptionlbl.config(fg="grey")
        self.descriptionlbl.pack(in_=self.holder, fill=tk.X, expand=True)

        self.install = Button(
            self,
            "Install",
            self.run_fetch_extension,
            font=("Segoi UI", 8),
            padx=10,
            pady=0,
            height=0,
        )
        if self.installed:
            self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
            self.install.set_command(self.remove_extension)

        self.install.pack(fill=tk.BOTH, expand=True)

        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
        self.hoveroff()

    def remove_extension(self, *_):
        self.manager.remove_extension(self)

    def run_fetch_extension(self, *_):
        self.manager.run_fetch_extension(self)

    def set_unavailable(self):
        self.install.config(text="Unavailable", bg=self.base.theme.biscuit_dark)

    def set_installed(self):
        self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
        self.install.set_command(self.remove_extension)

    def set_uninstalled(self):
        self.install.config(text="Install", bg=self.base.theme.biscuit)
        self.install.set_command(self.run_fetch_extension)

    def hoverin(self, *_) -> None:
        try:
            self.config(bg=self.hbg)
            self.namelbl.config(bg=self.hbg)
            self.authorlbl.config(bg=self.hbg)
            self.descriptionlbl.config(bg=self.hbg)
            self.holder.config(bg=self.hbg)
            self.topholder.config(bg=self.hbg)
        except:
            pass

    def hoveroff(self, *_) -> None:
        try:
            self.config(bg=self.bg)
            self.namelbl.config(bg=self.bg)
            self.authorlbl.config(bg=self.bg)
            self.descriptionlbl.config(bg=self.bg)
            self.holder.config(bg=self.bg)
            self.topholder.config(bg=self.bg)
        except:
            pass
