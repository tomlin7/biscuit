import os
import tkinter as tk
import requests, threading
from biscuit.core.components.utils import Frame, Label, Button


class Extension(Frame):
    def __init__(self, master, name, file, url, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.name = name
        self.file = os.path.join(self.base.extensionsdir, file)
        self.url = url
        self.installed = os.path.isfile(self.file)

        self.bg = self.base.theme.views.sidebar.item.background
        self.hbg = self.base.theme.views.sidebar.item.highlightbackground

        self.namelbl = Label(self, text=name, font=("Segoi UI", 11, "bold"), anchor=tk.W, 
                                  padx=10, pady=20, **self.base.theme.views.sidebar.item.content)
        self.namelbl.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.install = Button(self, "Install", self.run_fetch_extension, font=("Segoi UI", 8), padx=10, pady=0, height=0)
        if self.installed:
            self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
            self.install.set_command(self.remove_extension)

        self.install.pack(fill=tk.BOTH, expand=True)

        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
        self.hoveroff()
    
    def run_fetch_extension(self, *_):
        if self.installed:
            return
        
        threading.Thread(target=self.fetch_extension).start()

    def fetch_extension(self):
        try:
            response = requests.get(self.url)
            if response.status_code == 200:
                self.install_extension(response)
        except:
            self.install.config(text="Unavailable", bg=self.base.theme.biscuit_dark)

    def install_extension(self, response):
        with open(self.file, 'w') as fp:
            fp.write(response.text)

        self.base.logger.info(f"Fetching extension '{self.name}' successful.")
        self.base.notifications.info(f"Extension '{self.name}' has been installed!")

    def remove_extension(self, *_):
        try:
            os.remove(self.file)
            self.base.logger.info(f"Uninstalling extension '{self.name}' successful.")
            self.base.notifications.info(f"Extension '{self.name}' has been uninstalled!")
        except Exception as e:
            self.base.logger.error(f"Uninstalling extension '{self.name}' failed.\n{e}")

    def hoverin(self, *_):
        try:
            self.config(bg=self.hbg)
            self.namelbl.config(bg=self.hbg)
        except:
            pass
        
    def hoveroff(self, *_):
        try:
            self.config(bg=self.bg)
            self.namelbl.config(bg=self.bg)
        except:
            pass