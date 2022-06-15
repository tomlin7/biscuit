import json
import tkinter as tk

from .loadres import ResourcesLoader

class Resources:
    logo: tk.PhotoImage
    
    # TODO: more resources
    # ...
    
    def __init__(self, master):
        self.base = master.base

        self.loader = ResourcesLoader(self)
        self.load_data()

    def load_data(self):
        self.logo = self.loader.load_image("logo.png")
