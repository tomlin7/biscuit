import os
import tkinter as tk


class Resources:
    def __init__(self, master):
        self.base = master.base
        self.load_data()

    def load_data(self):
        self.logo = self.load_image("logo.png")
        self.stipple = self.get_res_path('stipple.xbm')

    def get_res_path(self, relative_path):
        return os.path.join(self.base.resdir, relative_path)

    def load_image(self, path):
        return tk.PhotoImage(file=self.get_res_path(path))
