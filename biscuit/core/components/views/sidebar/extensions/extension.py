import tkinter as tk
import requests, threading
from core.components.utils import Frame, Menubutton


class Extension(Frame):
    def __init__(self, master, name, url, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.item)

        self.name = name
        self.url = url

        self.namelbl = Menubutton(self, text=name, font=("Segoi UI", 11, "bold"), anchor=tk.W, 
                                  padx=10, pady=20, **self.base.theme.views.sidebar.item.button)
        self.namelbl.pack(fill=tk.BOTH)
    
    def run_fetch_extension(self):
        threading.Thread(target=self.fetch_extension).start()

    def fetch_extension(self):
        response = requests.get(self.url)
        if response.status_code == 200:
            print(response.text)
