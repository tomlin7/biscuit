import tkinter as tk

from .loader import ResourcesLoader

class Resources:
    def __init__(self, master):
        self.base = master.base

        self.loader = ResourcesLoader(self)
        self.load_data()

    def load_data(self):
        self.logo = self.loader.load_svg("logo.svg")
        self.stipple = self.loader.get_res_path('stipple.xbm')