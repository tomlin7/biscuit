import os
import tkinter as tk
import requests, threading
from core.components.utils import Frame, Label, Button


class Extension(Frame):
    def __init__(self, master, name, file, url, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.name = name
        self.file = os.path.join(self.base.extensionsdir, file)
        self.url = url

        self.namelbl = Label(self, text=name, font=("Segoi UI", 11, "bold"), anchor=tk.W, 
                                  padx=10, pady=20, **self.base.theme.views.sidebar.item.content)
        self.namelbl.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.install = Button(self, "Install", self.run_fetch_extension, font=("Segoi UI", 8), padx=10, pady=0, height=0)
        self.install.pack(fill=tk.BOTH, expand=True)

        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
    
    def run_fetch_extension(self, *_):
        threading.Thread(target=self.fetch_extension).start()

    def fetch_extension(self):
        response = requests.get(self.url)
        if response.status_code == 200:
            with open(self.file, 'w') as fp:
                fp.write(response.text)

            self.base.logger.info(f"Fetching extension '{self.name}' successful.")
            self.base.notifications.info(f"Extension '{self.name}' has been installed!")
            self.install.config(text="Installed", bg=self.base.theme.utils.button.highlightbackground)
            self.install.unbind_all("<Button-1>")

    def hoverin(self, *_):
        self.config(bg=self.base.theme.views.sidebar.item.highlightbackground)
        self.namelbl.config(bg=self.base.theme.views.sidebar.item.highlightbackground)
    
    def hoveroff(self, *_):
        self.config(bg=self.base.theme.views.sidebar.item.background)
        self.namelbl.config(bg=self.base.theme.views.sidebar.item.background)
    