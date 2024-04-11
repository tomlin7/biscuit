import os
import threading
import tkinter as tk

import requests

from biscuit.core.utils import Button, Frame, Label


class Extension(Frame):
    def __init__(self, master, name: str, data: list, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.data = data
        self.name = name
        self.file = os.path.join(self.base.extensionsdir, data[0])
        self.author = data[1]
        self.description = data[2]
        self.url = f"{master.repo_url}extensions/{data[0]}"
        self.installed = os.path.isfile(self.file)

        self.bg = self.base.theme.views.sidebar.item.background
        self.hbg = self.base.theme.views.sidebar.item.highlightbackground

        self.holder = Frame(self, padx=10, pady=20)
        self.holder.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.topholder = Frame(self.holder)
        self.topholder.pack(fill=tk.X, expand=True)

        self.namelbl = Label(self, text=name[0].upper()+name[1:], font=("Segoi UI", 11, "bold"), anchor=tk.W, 
                             **self.base.theme.views.sidebar.item.content)
        self.namelbl.pack(in_=self.topholder, side=tk.LEFT, fill=tk.X)

        self.authorlbl = Label(self, text=f"@{self.author}", font=("Segoi UI", 7, "bold"), anchor=tk.W, 
                               **self.base.theme.views.sidebar.item.content)
        self.authorlbl.config(fg="grey")
        self.authorlbl.pack(in_=self.topholder, side=tk.RIGHT, fill=tk.X)

        self.descriptionlbl = Label(self, text=self.description, font=("Segoi UI", 9), anchor=tk.W, 
                               **self.base.theme.views.sidebar.item.content)
        self.descriptionlbl.config(fg="grey")
        self.descriptionlbl.pack(in_=self.holder, fill=tk.X, expand=True)

        self.install = Button(self, "Install", self.run_fetch_extension, font=("Segoi UI", 8), padx=10, pady=0, height=0)
        if self.installed:
            self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
            self.install.set_command(self.remove_extension)

        self.install.pack(fill=tk.BOTH, expand=True)

        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
        self.hoveroff()

    def run_fetch_extension(self, *_) -> None:
        if self.installed:
            return

        threading.Thread(target=self.fetch_extension).start()

    def fetch_extension(self) -> None:
        try:
            response = requests.get(self.url)
            if response.status_code == 200:
                self.install_extension(response)
        except:
            self.install.config(text="Unavailable", bg=self.base.theme.biscuit_dark)

    def install_extension(self, response) -> None:
        with open(self.file, 'w') as fp:
            fp.write(response.text)

        self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
        self.install.set_command(self.remove_extension)

        self.base.logger.info(f"Fetching extension '{self.name}' successful.")
        self.base.notifications.info(f"Extension '{self.name}' has been installed!")

        self.base.extensions_manager.load_extension(self.data[0])

    def remove_extension(self, *_) -> None:
        try:
            os.remove(self.file)

            self.install.config(text="Install", bg=self.base.theme.biscuit)
            self.install.set_command(self.run_fetch_extension)

            self.base.logger.info(f"Uninstalling extension '{self.name}' successful.")
            self.base.notifications.info(f"Extension '{self.name}' has been uninstalled!")
        except Exception as e:
            self.base.logger.error(f"Uninstalling extension '{self.name}' failed.\n{e}")

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
